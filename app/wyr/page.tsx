import type { Metadata } from 'next';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getWyrPrompt, pickWyrPrompt, type Audience } from '@/lib/game-types';
import { buildWyrStats, type WYRChoice, type WYRStats } from '@/lib/wyr';
import { WyrClient } from './WyrClient';

// =============================================================================
// /wyr — Would You Rather vote experience.
//
// Server-renders the initial prompt + tally so the first paint is meaningful
// even for anon visitors. Subsequent rerolls happen client-side.
//
// Query params:
//   ?id=<wyr_id>            seed a specific prompt (used by share links)
//   ?audience=family|friends|couples   filter the prompt pool
// =============================================================================

export const metadata: Metadata = {
  title: 'Would You Rather · Truth or Cap',
  description: 'Pick A or B and watch the world split. Live percentages on every question.',
  openGraph: {
    title: 'Would You Rather — Truth or Cap',
    description: 'Pick A or B and watch the world split.',
  },
};

interface PageProps {
  searchParams: Promise<{
    id?: string;
    audience?: string;
  }>;
}

const AUDIENCES: Audience[] = ['family', 'friends', 'couples'];

export default async function WyrPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const audience: Audience | null = AUDIENCES.includes(params.audience as Audience)
    ? (params.audience as Audience)
    : null;

  const requested = params.id ? getWyrPrompt(params.id) : null;
  const prompt = requested ?? pickWyrPrompt({ audience: audience ?? undefined });

  // Initial stats — public RPC, safe to call as anon. We use the service
  // role client to skip a round-trip through anon's PostgREST URL but
  // either would work since the RPC is SECURITY DEFINER.
  let stats: WYRStats;
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin.rpc('wyr_question_stats', { p_question_id: prompt.id });
    const row = Array.isArray(data) ? data[0] : data;
    stats = buildWyrStats({
      questionId: prompt.id,
      votesA: Number(row?.votes_a ?? 0),
      votesB: Number(row?.votes_b ?? 0),
      total: Number(row?.total ?? 0),
    });
  } catch {
    // Service role not configured (preview/local) — render zeros and let
    // the client load on first vote.
    stats = buildWyrStats({ questionId: prompt.id, votesA: 0, votesB: 0, total: 0 });
  }

  // If the visitor is signed in, look up their previous vote on this prompt
  // so we render with their pick highlighted (and bars visible).
  let initialChoice: WYRChoice | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: priorVote } = await supabase
        .from('wyr_votes')
        .select('option_chosen')
        .eq('question_id', prompt.id)
        .eq('voter_id', user.id)
        .maybeSingle();
      if (priorVote?.option_chosen === 'A' || priorVote?.option_chosen === 'B') {
        initialChoice = priorVote.option_chosen;
      }
    }
  } catch {
    // Reading prior vote is best-effort — if Supabase rejects, the user
    // simply gets the unanswered state.
  }

  return (
    <WyrClient
      initialPrompt={prompt}
      initialStats={stats}
      initialChoice={initialChoice}
      audience={audience}
    />
  );
}
