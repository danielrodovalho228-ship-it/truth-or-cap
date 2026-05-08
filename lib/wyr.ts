// Would-You-Rather vote system — types and shared helpers consumed by
// /api/wyr routes and the /wyr UI. Tally rows live in Supabase
// (migration 0026_wyr_votes.sql); the catalog of prompts lives in
// `lib/game-types.ts` (WYR_PROMPTS) so both client and server stay aligned.

export type WYRChoice = 'A' | 'B';

export interface WYRStats {
  questionId: string;
  votesA: number;
  votesB: number;
  total: number;
  /** 0–100, rounded to one decimal. */
  pctA: number;
  /** 0–100, rounded to one decimal. */
  pctB: number;
}

export interface WYRPolarizingRow {
  questionId: string;
  votesA: number;
  votesB: number;
  total: number;
  pctA: number;
  pctB: number;
  /** 0 = perfect 50/50, 0.5 = 100/0. Lower is more divisive. */
  splitDistance: number;
}

/**
 * Decide which side of a vote a player landed on, relative to the crowd.
 * Used to show "you're in the minority!" / "most people agree with you".
 */
export function describeWyrInsight(
  choice: WYRChoice,
  stats: WYRStats
): { headline: string; subtext: string } {
  if (stats.total <= 1) {
    return {
      headline: "You're the first to vote.",
      subtext: 'Send this to friends and watch the split.',
    };
  }
  const pickedPct = choice === 'A' ? stats.pctA : stats.pctB;
  const otherPct = 100 - pickedPct;

  if (pickedPct >= 80) {
    return {
      headline: 'Crowd consensus.',
      subtext: `${pickedPct.toFixed(0)}% of voters picked the same.`,
    };
  }
  if (pickedPct >= 60) {
    return {
      headline: 'Most people agree with you.',
      subtext: `${pickedPct.toFixed(0)}% picked your side.`,
    };
  }
  if (pickedPct >= 45) {
    return {
      headline: 'Wildly divided.',
      subtext: `${pickedPct.toFixed(0)}% / ${otherPct.toFixed(0)}% — basically a coin flip.`,
    };
  }
  if (pickedPct >= 25) {
    return {
      headline: "You're in the minority.",
      subtext: `Only ${pickedPct.toFixed(0)}% picked your side.`,
    };
  }
  return {
    headline: 'Hot take.',
    subtext: `Only ${pickedPct.toFixed(0)}% picked your side. Defend it on camera.`,
  };
}

/** Convert raw RPC counts into a percentage-bearing stats object. */
export function buildWyrStats(input: {
  questionId: string;
  votesA: number;
  votesB: number;
  total: number;
}): WYRStats {
  const total = input.total;
  const pctA = total > 0 ? Math.round((input.votesA / total) * 1000) / 10 : 0;
  const pctB = total > 0 ? Math.round(((total - input.votesA) / total) * 1000) / 10 : 0;
  return {
    questionId: input.questionId,
    votesA: input.votesA,
    votesB: input.votesB,
    total,
    pctA,
    pctB,
  };
}
