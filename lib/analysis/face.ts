import type { Buffer } from 'node:buffer';
import type { HumeFaceResult } from '@/lib/types';

const HUME_API_KEY = process.env.HUME_API_KEY;
const HUME_BASE = 'https://api.hume.ai/v0/batch/jobs';
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 45;

export interface FaceAnalysis {
  score: number;
  raw: HumeFaceResult;
}

interface HumePrediction {
  emotions: Array<{ name: string; score: number }>;
}
interface HumeBatchPredictionsResponse {
  results: {
    predictions: Array<{
      models?: {
        face?: {
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
    if (json.state.status === 'FAILED') throw new Error('Hume face job failed');
  }
  throw new Error('Hume face job timed out');
}

export async function analyzeFace(buffer: Buffer, mimeType = 'video/webm'): Promise<FaceAnalysis> {
  if (!HUME_API_KEY) throw new Error('HUME_API_KEY not configured');

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), 'video.webm');
  formData.append(
    'json',
    JSON.stringify({
      models: {
        face: {
          fps_pred: 3, // 3 frames/s gives plenty of signal without burning budget
          identify_faces: false,
        },
      },
    })
  );

  const jobResp = await fetch(`${HUME_BASE}`, {
    method: 'POST',
    headers: { 'X-Hume-Api-Key': HUME_API_KEY },
    body: formData,
  });
  if (!jobResp.ok) {
    const errText = await jobResp.text();
    throw new Error(`Hume face job creation failed: ${jobResp.status} ${errText.slice(0, 200)}`);
  }
  const { job_id } = (await jobResp.json()) as { job_id: string };

  await pollUntilComplete(job_id);

  const predResp = await fetch(`${HUME_BASE}/${job_id}/predictions`, {
    headers: { 'X-Hume-Api-Key': HUME_API_KEY },
  });
  if (!predResp.ok) throw new Error(`Hume face predictions ${predResp.status}`);
  const predictions = (await predResp.json()) as HumeBatchPredictionsResponse[];

  const facePreds =
    predictions[0]?.results?.predictions?.[0]?.models?.face?.grouped_predictions?.[0]?.predictions ?? [];

  const aggregate: Record<string, number> = {};
  for (const f of facePreds) {
    for (const e of f.emotions) {
      aggregate[e.name] = (aggregate[e.name] ?? 0) + e.score;
    }
  }
  const denom = Math.max(1, facePreds.length);
  for (const k of Object.keys(aggregate)) aggregate[k] /= denom;

  const sus =
    (aggregate.Anxiety ?? 0) * 0.20 +
    (aggregate.Confusion ?? 0) * 0.15 +
    (aggregate.Doubt ?? 0) * 0.20 +
    (aggregate.Guilt ?? 0) * 0.20 +
    (aggregate.Shame ?? 0) * 0.15 +
    (aggregate.Surprise ?? 0) * 0.10;
  const honest =
    (aggregate.Calmness ?? 0) * 0.4 +
    (aggregate.Joy ?? 0) * 0.3 +
    (aggregate.Determination ?? 0) * 0.3;

  const rawScore = sus - honest * 0.4;
  const normalized = Math.max(0, Math.min(100, Math.round((rawScore + 0.4) * 100)));

  return {
    score: normalized,
    raw: { expressions: aggregate, micro_expressions: [] },
  };
}
