import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/analysis/transcription';
import { analyzeVoice } from '@/lib/analysis/voice';
import { analyzeFace } from '@/lib/analysis/face';
import { analyzeLinguistic } from '@/lib/analysis/linguistic';
import { aggregateScore } from '@/lib/analysis/scoring';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Sentinel value to claim a round and prevent concurrent analyze spend.
const ANALYZING_SENTINEL = -1;

export async function POST(req: NextRequest) {
  let body: { roundId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId } = body;
  if (!roundId || typeof roundId !== 'string' || roundId.length > 64) {
    return NextResponse.json({ error: 'roundId required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('*')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (!round.recording_url) return NextResponse.json({ error: 'No recording uploaded yet' }, { status: 400 });
  if (round.sus_level !== null && round.sus_level !== ANALYZING_SENTINEL) {
    return NextResponse.json({ round, alreadyAnalyzed: true });
  }

  // Atomic claim: only one concurrent analyze wins.
  const { data: claimed } = await admin
    .from('room_rounds')
    .update({ sus_level: ANALYZING_SENTINEL })
    .eq('id', roundId)
    .is('sus_level', null)
    .select('id')
    .maybeSingle();
  if (!claimed) {
    // Another worker already claimed it.
    return NextResponse.json({ round, alreadyClaimed: true });
  }

  // Path validation: recording must be inside rooms/ prefix to prevent reading other recordings.
  if (!/^rooms\/[A-Za-z0-9-]+\.webm$/.test(round.recording_url)) {
    await admin.from('room_rounds').update({ sus_level: 50, analysis_summary: 'invalid path' }).eq('id', roundId);
    return NextResponse.json({ error: 'Invalid recording path' }, { status: 400 });
  }

  // Wrap entire pipeline in a try/finally that ALWAYS writes a sus_level so the round never sticks at sentinel.
  let finalSus = 50;
  let finalSummary = 'no signals';
  try {
    const { data: signed } = await admin.storage
      .from('recordings')
      .createSignedUrl(round.recording_url, 60);
    if (!signed?.signedUrl) {
      finalSummary = 'recording fetch failed';
      return NextResponse.json({ error: 'Could not load recording' }, { status: 500 });
    }

    let buffer: Buffer;
    try {
      const r = await fetch(signed.signedUrl);
      buffer = Buffer.from(await r.arrayBuffer());
    } catch {
      finalSummary = 'recording download failed';
      return NextResponse.json({ error: 'Recording fetch failed' }, { status: 500 });
    }

    // Race the whole AI pipeline against a 50s budget so we always have time to write.
    const ANALYZE_BUDGET_MS = 50_000;
    const pipeline = (async () => {
      const [transcript, voice, face] = await Promise.allSettled([
        transcribeAudio(buffer, 'video/webm'),
        analyzeVoice(buffer, 'video/webm'),
        analyzeFace(buffer, 'video/webm'),
      ]);

      const transcriptText = transcript.status === 'fulfilled' ? transcript.value.text : '';
      const linguistic = transcriptText
        ? await analyzeLinguistic({
            transcription: transcriptText,
            question: round.question,
            declaredAnswer: round.declared_answer ?? 'truth',
          }).catch(() => null)
        : null;

      const aggregate = aggregateScore({
        voice: voice.status === 'fulfilled' ? voice.value : null,
        face: face.status === 'fulfilled' ? face.value : null,
        linguistic,
        duration_ms: 30000,
      });

      const summaryParts: string[] = [];
      if (voice.status === 'fulfilled') summaryParts.push(`voice ${(voice.value.score).toFixed(0)}`);
      if (face.status === 'fulfilled') summaryParts.push(`face ${(face.value.score).toFixed(0)}`);
      if (linguistic) summaryParts.push(`language ${(linguistic.score).toFixed(0)}`);
      return { sus: aggregate.susLevel, summary: summaryParts.length ? summaryParts.join(' / ') : 'no signals' };
    })();

    const timeout = new Promise<{ sus: number; summary: string }>((resolve) => {
      setTimeout(() => resolve({ sus: 50, summary: 'analysis timeout' }), ANALYZE_BUDGET_MS);
    });

    const result = await Promise.race([pipeline, timeout]);
    finalSus = result.sus;
    finalSummary = result.summary;

    return NextResponse.json({ susLevel: finalSus, summary: finalSummary });
  } finally {
    // ALWAYS write something so the round never sticks at sentinel.
    await admin
      .from('room_rounds')
      .update({ sus_level: finalSus, analysis_summary: finalSummary })
      .eq('id', roundId);
    // Best-effort cost log.
    try {
      await admin.from('api_cost_log').insert({
        endpoint: '/api/room/round/analyze',
        cost_usd: 0.09,
        meta: { roundId, summary: finalSummary },
      });
    } catch {
      // table may not exist, swallow.
    }
  }
}
