import OpenAI from 'openai';
import type { Buffer } from 'node:buffer';

const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({ apiKey }) : null;

export interface TranscriptionResult {
  text: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
  duration_seconds: number;
}

/**
 * Transcribe audio (or video — Whisper accepts both) using OpenAI Whisper.
 * Returns plain text + per-segment timestamps so we can correlate with
 * Hume's per-utterance results in the future.
 */
export async function transcribeAudio(
  buffer: Buffer,
  mimeType = 'video/webm'
): Promise<TranscriptionResult> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');

  // Pick a sane filename extension Whisper recognises.
  const ext =
    mimeType.includes('mp4') ? 'mp4' :
    mimeType.includes('mpeg') ? 'mp3' :
    mimeType.includes('wav') ? 'wav' : 'webm';

  const file = new File([new Uint8Array(buffer)], `recording.${ext}`, { type: mimeType });

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const verbose = response as unknown as {
    text: string;
    language?: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  return {
    text: verbose.text ?? '',
    language: verbose.language ?? 'en',
    segments: verbose.segments ?? [],
    duration_seconds: verbose.duration ?? 0,
  };
}
