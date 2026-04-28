import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/analysis/transcription';
import { analyzeVoice } from '@/lib/analysis/voice';
import { analyzeFace } from '@/lib/analysis/face';
import { analyzeLinguistic } from '@/lib/analysis/linguistic';
import { aggregateScore } from '@/lib/analysis/scoring';
import { calculateCost, logCost } from '@/lib/analysis/cost';

// Hume + Whisper need Node buffers, not edge runtime. Bump the timeout —
// Hume batch jobs can take 20-40s on top of upload + Claude.
export const runtime = 'nodejs';
export const maxDuration = 60;

const AnalyzeSchema = z.object({
  gameId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const { gameId } = parsed.data;

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('player_id', user.id)
    .single();
  if (gameErr || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // If we already analyzed it (idempotency), return existing result.
  const { data: existing } = await supabase
    .from('analyses')
    .select('id, sus_level, reasons')
    .eq('game_id', gameId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      success: true,
      gameId,
      susLevel: existing.sus_level,
      reasons: existing.reasons,
      cached: true,
    });
  }

  // Service role for storage download (bucket is private + signed-only).
  const admin = createServiceRoleClient();
  const { data: fileBlob, error: dlErr } = await admin
    .storage
    .from('recordings')
    .download(game.recording_url);
  if (dlErr || !fileBlob) {
    console.error('[analyze] download failed:', dlErr);
    return NextResponse.json({ error: 'Could not load recording' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const mime = fileBlob.type || 'video/webm';
  const durationMs = game.recording_duration_ms;

  // Run the 3 heavy providers in parallel; settle so one failure doesn't
  // sink the others. Linguistic depends on Whisper output → run after.
  const [transcriptionRes, voiceRes, faceRes] = await Promise.allSettled([
    transcribeAudio(buffer, mime),
    analyzeVoice(buffer, mime),
    analyzeFace(buffer, mime),
  ]);

  const transcription = transcriptionRes.status === 'fulfilled' ? transcriptionRes.value : null;
  const voice = voiceRes.status === 'fulfilled' ? voiceRes.value : null;
  const face = faceRes.status === 'fulfilled' ? faceRes.value : null;

  if (transcriptionRes.status === 'rejected') console.error('[analyze] whisper failed:', transcriptionRes.reason);
  if (voiceRes.status === 'rejected') console.error('[analyze] hume voice failed:', voiceRes.reason);
  if (faceRes.status === 'rejected') console.error('[analyze] hume face failed:', faceRes.reason);

  // Linguistic — only if we got a transcript.
  let linguistic = null;
  if (transcription && transcription.text.trim().length > 0) {
    try {
      linguistic = await analyzeLinguistic({
        transcription: transcription.text,
        question: game.question,
        declaredAnswer: game.declared_answer,
      });
    } catch (err) {
      console.error('[analyze] linguistic failed:', err);
    }
  }

  // Bail if too many providers died — don't ship a meaningless score.
  const survivors = [voice, face, linguistic].filter(Boolean).length;
  if (survivors === 0) {
    return NextResponse.json(
      { error: 'Analysis failed — all AI providers errored. Try again in a minute.' },
      { status: 502 }
    );
  }

  const aggregate = aggregateScore({
    voice,
    face,
    linguistic,
    duration_ms: durationMs,
  });

  const processingMs = Date.now() - startTime;

  // Persist analysis (service role bypasses RLS).
  const { error: insertErr } = await admin.from('analyses').insert({
    game_id: gameId,
    sus_level: aggregate.susLevel,
    voice_stress_score: voice?.score ?? null,
    facial_score: face?.score ?? null,
    linguistic_score: linguistic?.score ?? null,
    transcription: transcription?.text ?? null,
    reasons: aggregate.reasons,
    raw_voice_data: voice?.raw ?? null,
    raw_facial_data: face?.raw ?? null,
    processing_time_ms: processingMs,
    model_version: 'mvp_v1',
  });
  if (insertErr) {
    console.error('[analyze] insert failed:', insertErr);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }

  // Cost log — fire-and-forget (errors logged inside).
  const costPromises: Promise<void>[] = [];
  if (transcription) {
    costPromises.push(
      logCost(admin, {
        user_id: user.id,
        game_id: gameId,
        provider: 'whisper',
        cost_usd: calculateCost({ provider: 'whisper', durationMs }),
        duration_ms: durationMs,
      })
    );
  }
  if (voice) {
    costPromises.push(
      logCost(admin, {
        user_id: user.id,
        game_id: gameId,
        provider: 'hume_voice',
        cost_usd: calculateCost({ provider: 'hume_voice', durationMs }),
        duration_ms: durationMs,
      })
    );
  }
  if (face) {
    costPromises.push(
      logCost(admin, {
        user_id: user.id,
        game_id: gameId,
        provider: 'hume_face',
        cost_usd: calculateCost({ provider: 'hume_face', durationMs }),
        duration_ms: durationMs,
      })
    );
  }
  if (linguistic) {
    costPromises.push(
      logCost(admin, {
        user_id: user.id,
        game_id: gameId,
        provider: 'claude',
        cost_usd: calculateCost({
          provider: 'claude',
          inputTokens: linguistic.inputTokens,
          outputTokens: linguistic.outputTokens,
        }),
      })
    );
  }
  await Promise.allSettled(costPromises);

  return NextResponse.json({
    success: true,
    gameId,
    susLevel: aggregate.susLevel,
    reasons: aggregate.reasons,
    confidence: aggregate.confidence,
    processing_time_ms: processingMs,
    weights: aggregate.weights,
    degraded: survivors < 3,
  });
}
