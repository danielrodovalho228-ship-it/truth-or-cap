import type { SupabaseClient } from '@supabase/supabase-js';

// Cost calculation for each AI provider call. Numbers reflect public pricing
// at time of writing — adjust if providers change rates.
//
// Each successful provider call from /api/analyze writes a row into
// public.api_cost_log so that /admin (M09) can graph spend over time and
// fire alerts when the daily threshold is breached.
//
// Pricing references (as of 2026-04):
//   - OpenAI Whisper:   $0.006 / minute of audio
//   - Hume AI Voice:    $0.05 / minute of audio
//   - Hume AI Face:     $0.05 / minute of video
//   - Anthropic Claude: $3.00 / MTok input, $15.00 / MTok output (Sonnet 4)
//
// Update RATES below when providers change their pricing. The numeric values
// in api_cost_log are precomputed at call time, so historical rows stay
// accurate even after a future rate change.

export type Provider = 'whisper' | 'hume_voice' | 'hume_face' | 'claude';

interface CostInput {
  provider: Provider;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
}

const RATES = {
  whisper_per_min: 0.006,
  hume_voice_per_min: 0.05,
  hume_face_per_min: 0.05,
  claude_input_per_mtok: 3.0,
  claude_output_per_mtok: 15.0,
};

/** Compute USD cost for a single provider call. */
export function calculateCost(input: CostInput): number {
  switch (input.provider) {
    case 'whisper':
      return ((input.durationMs ?? 0) / 60_000) * RATES.whisper_per_min;
    case 'hume_voice':
      return ((input.durationMs ?? 0) / 60_000) * RATES.hume_voice_per_min;
    case 'hume_face':
      return ((input.durationMs ?? 0) / 60_000) * RATES.hume_face_per_min;
    case 'claude':
      return (
        ((input.inputTokens ?? 0) / 1_000_000) * RATES.claude_input_per_mtok +
        ((input.outputTokens ?? 0) / 1_000_000) * RATES.claude_output_per_mtok
      );
  }
}

/**
 * Persist a cost row using the service role client. Failures here should
 * NOT bubble up — analytics writes shouldn't break the user flow.
 *
 * The caller already has a SupabaseClient (typically the service-role one
 * from createServiceRoleClient), so we just borrow it instead of creating
 * a new one each call.
 */
export async function logCost(
  client: SupabaseClient,
  row: {
    user_id: string | null;
    game_id: string | null;
    provider: Provider;
    cost_usd: number;
    duration_ms?: number;
  }
): Promise<void> {
  try {
    const { error } = await client.from('api_cost_log').insert(row);
    if (error) console.error('[cost-log] insert failed:', error);
  } catch (err) {
    console.error('[cost-log] threw:', err);
  }
}
