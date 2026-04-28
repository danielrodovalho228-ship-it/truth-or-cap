// Voice baseline helpers. Heavy feature extraction (pitch, prosody) lives
// in M04 once the Hume API is wired up — for M03 we capture audio + persist
// timestamps so the trigger fires "voice_baseline_captured" and the user
// gets credit for completing the step.

export interface BaselineMeta {
  storage_path: string;
  duration_ms: number;
  sample_rate: number;
  captured_at: string;
}

/**
 * Build a deterministic-ish path so we never overwrite a previous baseline.
 * Storage RLS already restricts uploads to {userId}/* via storage_setup.sql.
 */
export function baselinePath(userId: string): string {
  return `${userId}/baseline-${Date.now()}.webm`;
}

/**
 * Compute crude features from an AnalyserNode while recording is happening.
 * For M03 we only return the energy series (RMS-style) — Hume gives us the
 * real numbers in M04.
 */
export function sampleEnergy(analyser: AnalyserNode): number {
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}
