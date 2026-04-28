import type { Metadata } from 'next';
import { requireProfile } from '@/lib/auth/guard';
import { getGameType, pickQuestionFor, type GameType } from '@/lib/game-types';
import { NewGameClient } from './NewGameClient';

// =============================================================================
// /jogo/novo — entry point for recording a new game.
//
// Accepts query params:
//   ?type=<game_type>         which game format to load (classic, two_truths_one_lie, ...)
//   ?audience=<audience>      family / friends / couples (passed through to UI)
//   ?question=<text>          pre-seed a specific question (used by challenge-back)
//   ?from=<gameId>            source game for challenge-back
//   ?opponent=<username>      who you're challenging back
//
// Server component: gates auth + resolves game type + picks initial question.
// All interactive bits live in NewGameClient.
// =============================================================================

export const metadata: Metadata = {
  title: 'New game · Truth or Cap',
  description: 'Pick a question, record your 30-second answer, send to friends.',
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{
    question?: string;
    from?: string;
    opponent?: string;
    type?: string;
    audience?: string;
  }>;
}

export default async function NewGamePage({ searchParams }: PageProps) {
  await requireProfile('/jogo/novo');
  const params = await searchParams;

  const gameType = getGameType(params.type);
  const presetQuestion = params.question?.slice(0, 500);
  const initialQuestion = presetQuestion ?? pickQuestionFor(gameType.id as GameType);

  return (
    <NewGameClient
      initialQuestion={initialQuestion}
      questionLocked={Boolean(presetQuestion)}
      opponent={params.opponent ?? null}
      fromGameId={params.from ?? null}
      gameTypeId={gameType.id}
      gameTypeLabel={gameType.label}
      defaultDurationMs={gameType.defaultDurationMs}
    />
  );
}

// =============================================================================
// END OF FILE — keep these trailing comments here as a buffer.
//
// OneDrive sync sometimes pads rewritten files with NULL bytes when the new
// content is shorter than the previous version on disk. The bytes land where
// the old file used to extend, which can break the SWC parser ("Unexpected
// character '\\0'"). Padding with this multi-line comment block at the end
// ensures any padding lands inside the comment and is harmless.
// =============================================================================
