'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QuestionTape } from '@/components/result/QuestionTape';
import { VideoEvidence } from '@/components/result/VideoEvidence';
import { SusLevelReveal } from '@/components/result/SusLevelReveal';
import { EvidenceCard } from '@/components/result/EvidenceCard';
import { VoteWidget } from '@/components/result/VoteWidget';
import { ShareSheet } from '@/components/result/ShareSheet';
import { PlayCTA } from '@/components/result/PlayCTA';
import type { AnalysisReason, Vote, ViewState } from '@/lib/types';
import type { VoteCounts } from '@/hooks/useRealtimeVotes';

interface GameSummary {
  id: string;
  player_id: string;
  player_username: string;
  question: string;
  declared_answer: Vote;
  recording_url: string;
  created_at: string;
}

interface AnalysisSummary {
  sus_level: number;
  reasons: AnalysisReason[];
}

interface ResultClientProps {
  game: GameSummary;
  analysis: AnalysisSummary | null;
  viewState: ViewState;
  initialCounts: VoteCounts;
  initialUserVote: Vote | null;
}

export function ResultClient({
  game,
  analysis,
  viewState,
  initialCounts,
  initialUserVote,
}: ResultClientProps) {
  // FIRST_VISITOR sees a gated flow: must vote BEFORE we reveal SUS LEVEL.
  // OWNER + RETURNING_VIEWER see everything immediately.
  const [hasVoted, setHasVoted] = useState<boolean>(
    viewState !== 'FIRST_VISITOR' || initialUserVote !== null
  );
  const [userVote, setUserVote] = useState<Vote | null>(initialUserVote);

  // Resolve share URL after mount so SSR markup matches CSR (no
  // hydration warning from `window.location.href` at render time).
  const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/game/${game.id}`;
  const [shareUrl, setShareUrl] = useState(fallbackUrl);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const showReveal = analysis !== null && (viewState === 'OWNER' || hasVoted);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="max-w-md mx-auto w-full">
        <QuestionTape
          username={game.player_username}
          question={game.question}
          declaredAnswer={game.declared_answer}
          createdAt={game.created_at}
        />

        <div className="px-6">
          <VideoEvidence gameId={game.id} />
        </div>

      {/* FIRST_VISITOR: gated vote BEFORE reveal */}
      {viewState === 'FIRST_VISITOR' && !hasVoted ? (
        <VoteWidget
          gameId={game.id}
          initialCounts={initialCounts}
          initialUserVote={null}
          variant="gated"
          onVoteCast={(v) => {
            setUserVote(v);
            setHasVoted(true);
            // Cookie set by /api/vote so future visits skip the gate.
          }}
        />
      ) : null}

      {showReveal && analysis ? (
        <>
          <SusLevelReveal
            susLevel={analysis.sus_level}
            userVote={userVote}
            declaredAnswer={game.declared_answer}
          />

          {analysis.reasons.length > 0 ? (
            <section className="px-6 pb-6">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
                Forensic evidence
              </p>
              <ul className="space-y-2">
                {analysis.reasons.map((r, i) => (
                  <EvidenceCard key={i} reason={r} index={i} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* OWNER + RETURNING_VIEWER see counts after reveal */}
          {viewState !== 'FIRST_VISITOR' ? (
            <VoteWidget
              gameId={game.id}
              initialCounts={initialCounts}
              initialUserVote={initialUserVote}
              variant="inline"
            />
          ) : null}

          {/* Challenge-back amplifier — only for non-owner viewers post-vote */}
          {viewState !== 'OWNER' && hasVoted ? (
            <PlayCTA
              opponentUsername={game.player_username}
              opponentSusLevel={analysis.sus_level}
              fromGameId={game.id}
            />
          ) : null}
        </>
      ) : null}

      {!analysis ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 py-10 text-center"
        >
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            Analysis pending — refresh in a moment.
          </p>
        </motion.section>
      ) : null}
      </div>

      <ShareSheet
        username={game.player_username}
        question={game.question}
        susLevel={analysis?.sus_level ?? 50}
        url={shareUrl}
      />
    </main>
  );
}
