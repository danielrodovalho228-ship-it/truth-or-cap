import type { Buffer } from 'node:buffer';
import type { HumeVoiceResult } from '@/lib/types';

const HUME_API_KEY = process.env.HUME_API_KEY;
const HUME_BASE = 'https://api.hume.ai/v0/batch/jobs';
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 45; // ~45s ceiling

/** Emotions we track for "stress" vs "calm" balance. */
const SUS_EMOTIONS = ['Anxiety', 'Confusion', 'Distress', 'Doubt', 'Fear', 'Nervousness'];
const CALM_EMOTIONS = ['Calmness', 'Confidence', 'Determination'];

export interface VoiceAnalysis {
  score: number; // 0-100, "stress / sus" level
  raw: HumeVoiceResult;
}

interface HumePrediction {
  emotions: Array<{ name: string; score: number }>;
}
interface HumeBatchPredictionsResponse {
  results: {
    predictions: Array<{
      models?: {
        prosody?: {
          grouped_predictions?: Array<{ predictions: HumePrediction[] }>;
        };
      };
    }>;
  };
}

async function pollUntilComplete(jobId: string): Promise<void> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const resp = await fetch(`${HUME_BASE}/${jobId}`, {
      headers: { 'X-Hume-Api-Key': HUME_API_KEY! },
    });
    if (!resp.ok) throw new Error(`Hume status ${resp.status}`);
    const json = (await resp.json()) as { state: { status: string } };
    if (json.state.status === 'COMPLETED') return;
    if (json.state.status === 'FAILED') throw new Error('Hume job failed');
  }
  throw new Error('Hume job timed out');
}

export async function analyzeVoice(buffer: Buffer, mimeType = 'audio/webm'): Promise<VoiceAnalysis> {
  if (!HUME_API_KEY) throw new Error('HUME_API_KEY not configured');

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), 'audio.webm');
  formData.append(
    'json',
    JSON.stringify({ models: { prosody: { granularity: 'utterance' } } })
  );

  const jobResp = await fetch(`${HUME_BASE}`, {
    method: 'POST',
    headers: { 'X-Hume-Api-Key': HUME_API_KEY },
    body: formData,
  });
  if (!jobResp.ok) {
    const errText = await jobResp.text();
    throw new Error(`Hume voice job creation failed: ${jobResp.status} ${errText.slice(0, 200)}`);
  }
  const { job_id } = (await jobResp.json()) as { job_id: string };

  await pollUntilComplete(job_id);

  const predResp = await fetch(`${HUME_BASE}/${job_id}/predictions`, {
    headers: { 'X-Hume-Api-Key': HUME_API_KEY },
  });
  if (!predResp.ok) throw new Error(`Hume predictions ${predResp.status}`);
  const predictions = (await predResp.json()) as HumeBatchPredictionsResponse[];

  const utterances =
    predictions[0]?.results?.predictions?.[0]?.models?.prosody?.grouped_predictions?.[0]?.predictions ?? [];

  const emotionTotals: Record<string, number> = {};
  for (const utt of utterances) {
    for (const e of utt.emotions) {
      if (SUS_EMOTIONS.includes(e.name) || CALM_EMOTIONS.includes(e.name)) {
        emotionTotals[e.name] = (emotionTotals[e.name] ?? 0) + e.score;
      }
    }
  }
  const denom = Math.max(1, utterances.length);
  for (const k of Object.keys(emotionTotals)) emotionTotals[k] /= denom;

  const stress =
    (emotionTotals.Anxiety ?? 0) * 0.25 +
    (emotionTotals.Nervousness ?? 0) * 0.25 +
    (emotionTotals.Doubt ?? 0) * 0.20 +
    (emotionTotals.Distress ?? 0) * 0.15 +
    (emotionTotals.Fear ?? 0) * 0.15;
  const calm =
    (emotionTotals.Calmness ?? 0) * 0.5 +
    (emotionTotals.Confidence ?? 0) * 0.5;

  const rawScore = stress - calm * 0.5;
  // Map [-0.5, 0.5] → [0, 100]; clamp.
  const normalized = Math.max(0, Math.min(100, Math.round((rawScore + 0.5) * 100)));

  return {
    score: normalized,
    raw: {
      prosody: {
        confidence: emotionTotals.Confidence ?? 0,
        sadness: emotionTotals.Sadness ?? 0,
        anger: emotionTotals.Anger ?? 0,
        fear: emotionTotals.Fear ?? 0,
        surprise: emotionTotals.Surprise ?? 0,
        nervousness: emotionTotals.Nervousness ?? 0,
        ...emotionTotals,
      },
      speech_rate: 0,
      pitch_variance: 0,
      pause_count: 0,
    },
  };
}
