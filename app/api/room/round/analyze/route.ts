import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/analysis/transcription';
import { analyzeVoice } from '@/lib/analysis/voice';
import { analyzeFace } from '@/lib/analysis/face';
import { analyzeLinguistic } from '@/lib/analysis/linguistic';
import { aggregateScore } from '@/lib/analysis/scoring';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { roundId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId } = body;
  if (!roundId) return NextResponse.json({ error: 'roundId required' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('*')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (!round.recording_url) return NextResponse.json({ error: 'No recording uploaded yet' }, { status: 400 });
  if (round.sus_level !== null) {
    return NextResponse.json({ round, alreadyAnalyzed: true });
  }

  // Download the recording from Storage. recording_url is a path inside the
  // private "recordings" bucket; create a short-lived signed URL to fetch it.
  const { data: signed } = await admin.storage
    .from('recordings')
    .createSignedUrl(round.recording_url, 60);
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not load recording' }, { status: 500 });
  }

  let buffer: Buffer;
  try {
    const r = await fetch(signed.signedUrl);
    buffer = Buffer.from(await r.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'Recording fetch failed' }, { status: 500 });
  }

  // Run analyses in parallel; tolerate individual failures (graceful degrade).
  const [transcript, voice, face] = await Promise.allSettled([
    transcribeAudio(buffer, 'video/webm'),
    analyzeVoice(buffer, 'video/webm'),
    analyzeFace(buffer, 'video/webm'),
  ]);

  const transcriptText = transcript.status === 'fulfilled' ? transcript.value.text : '';
  const linguistic = transcriptText
    ? await analyzeLinguistic({ transcription: transcriptText, question: round.question, declaredAnswer: round.declared_answer ?? "truth" }).catch(() => null)
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
  const summary = summaryParts.length ? summaryParts.join(' / ') : 'no signals';

  await admin
    .from('room_rounds')
    .update({
      sus_level: aggregate.susLevel,
      analysis_summary: summary,
    })
    .eq('id', roundId);

  return NextResponse.json({
    susLevel: aggregate.susLevel,
    confidence: aggregate.confidence,
    reasons: aggregate.reasons,
    summary,
  });
}
