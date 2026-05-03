import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { rateLimit, HOUR_MS } from '@/lib/rate-limit';
import { transcribeAudio } from '@/lib/analysis/transcription';
import { analyzeVoice } from '@/lib/analysis/voice';
import { analyzeFace } from '@/lib/analysis/face';
import { analyzeLinguistic } from '@/lib/analysis/linguistic';
import { aggregateScore } from '@/lib/analysis/scoring';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ANALYZING_SENTINEL = -1;
const MAX_AUDIO_BYTES = 25_000_000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const rlKey = user ? 'analyze:u:' + user.id : 'analyze:ip:' + ip;
  const rl = rateLimit(rlKey, 10, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many analyses. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

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

  const { data: claimed } = await admin
    .from('room_rounds')
    .update({ sus_level: ANALYZING_SENTINEL })
    .eq('id', roundId)
    .is('sus_level', null)
    .select('id')
    .maybeSingle();
  if (!claimed) {
    return NextResponse.json({ round, alreadyClaimed: true });
  }

  if (!/^rooms\/[A-Za-z0-9-]+\.(webm|mp4)$/.test(round.recording_url)) {
    await admin.from('room_rounds').update({ sus_level: 50, analysis_summary: 'invalid path' }).eq('id', roundId);
    return NextResponse.json({ error: 'Invalid recording path' }, { status: 400 });
  }

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
      const contentLen = Number(r.headers.get('content-length') ?? 0);
      if (contentLen > MAX_AUDIO_BYTES) {
        finalSummary = 'recording too large';
        return NextResponse.json({ error: 'Recording too large' }, { status: 413 });
      }
      buffer = Buffer.from(await r.arrayBuffer());
      if (buffer.byteLength > MAX_AUDIO_BYTES) {
        finalSummary = 'recording too large';
        return NextResponse.json({ error: 'Recording too large' }, { status: 413 });
      }
    } catch {
      finalSummary = 'recording download failed';
      return NextResponse.json({ error: 'Recording fetch failed' }, { status: 500 });
    }

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

      const parts: string[] = [];
      if (voice.status === 'fulfilled') parts.push('voice ' + voice.value.score.toFixed(0));
      if (face.status === 'fulfilled') parts.push('face ' + face.value.score.toFixed(0));
      if (linguistic) parts.push('language ' + linguistic.score.toFixed(0));
      return { sus: aggregate.susLevel, summary: parts.length ? parts.join(' / ') : 'no signals' };
    })();

    const timeout = new Promise<{ sus: number; summary: string }>((resolve) => {
      setTimeout(() => resolve({ sus: 50, summary: 'analysis timeout' }), ANALYZE_BUDGET_MS);
    });

    const result = await Promise.race([pipeline, timeout]);
    finalSus = result.sus;
    finalSummary = result.summary;

    return NextResponse.json({ susLevel: finalSus, summary: finalSummary });
  } finally {
    await admin
      .from('room_rounds')
      .update({ sus_level: finalSus, analysis_summary: finalSummary })
      .eq('id', roundId);
    try {
      await admin.from('api_cost_log').insert({
        endpoint: '/api/room/round/analyze',
        cost_usd: 0.09,
        meta: { roundId, summary: finalSummary },
      });
    } catch {
      /* table may not exist */
    }
  }
}
