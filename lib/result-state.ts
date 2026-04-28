import type { cookies } from 'next/headers';
import type { ViewState } from '@/lib/types';

/** Cookie name for "this anonymous browser already voted on game X". */
export function votedCookieName(gameId: string): string {
  return `voted_${gameId}`;
}

/**
 * Pure helper used by /jogo/[id]/page.tsx to figure out which view state
 * the current request belongs to. Keeps the page component clean.
 */
export function detectViewState({
  authedUserId,
  ownerId,
  cookieStore,
  gameId,
}: {
  authedUserId: string | null;
  ownerId: string;
  cookieStore: Awaited<ReturnType<typeof cookies>>;
  gameId: string;
}): ViewState {
  if (authedUserId && authedUserId === ownerId) return 'OWNER';
  const voted = cookieStore.get(votedCookieName(gameId))?.value === '1';
  if (voted) return 'RETURNING_VIEWER';
  return 'FIRST_VISITOR';
}
