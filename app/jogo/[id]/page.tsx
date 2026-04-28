import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { detectViewState } from '@/lib/result-state';
import { ResultClient } from './ResultClient';
import type { AnalysisReason, Vote } from '@/lib/types';

// =============================================================================
// /jogo/[id] — public game result page.
//
// Server component. Pulls the game + analysis + initial vote counts in one
// burst, decides the viewer's view state (OWNER / FIRST_VISITOR / RETURNING),
// and hands off to ResultClient for the reveal animation, vote widget, and
// share sheet.
//
// generateMetadata is what powers the Open Graph preview image — Supabase
// reads run as the anon role here, gated by RLS, so private games stay
// private when shared.
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase
    .from('games')
    .select('player_username, question')
    .eq('id', id)
    .maybeSingle();

  if (!game) return { title: 'Game not found · Truth or Cap', robots: { index: false } };

  const title = `@${game.player_username} on Truth or Cap`;
  const description = `${game.question} — Can you spot the cap?`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: `/jogo/${id}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/jogo/${id}/opengraph-image`],
    },
  };
}

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!game) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const viewState = detectViewState({
    authedUserId: user?.id ?? null,
    ownerId: game.player_id,
    cookieStore,
    gameId: id,
  });

  const { data: analysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('game_id', id)
    .maybeSingle();

  // Vote counts (initial paint) + caller's existing vote, if any.
  const { data: voteRows } = await supabase
    .from('votes')
    .select('vote, voter_id')
    .eq('game_id', id);

  const counts = { truth: 0, cap: 0 };
  let userVote: Vote | null = null;
  for (const v of voteRows ?? []) {
    if (v.vote === 'truth') counts.truth += 1;
    else if (v.vote === 'cap') counts.cap += 1;
    if (user && v.voter_id === user.id) userVote = v.vote as Vote;
  }

  return (
    <ResultClient
      game={{
        id: game.id,
        player_id: game.player_id,
        player_username: game.player_username,
        question: game.question,
        declared_answer: game.declared_answer as Vote,
        recording_url: game.recording_url,
        created_at: game.created_at,
      }}
      analysis={
        analysis
          ? {
              sus_level: analysis.sus_level,
              reasons: (analysis.reasons ?? []) as AnalysisReason[],
            }
          : null
      }
      viewState={viewState}
      initialCounts={counts}
      initialUserVote={userVote}
    />
  );
}

// =============================================================================
// END OF FILE — buffer comments to absorb any trailing NULL bytes that
// OneDrive sync tends to inject when shrinking files. Leave this block in
// place. Without it, `next dev` fails with "Unexpected character '\\0'".
// =============================================================================
