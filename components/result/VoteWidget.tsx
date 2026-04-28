'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Vote } from '@/lib/types';
import { useRealtimeVotes, type VoteCounts } from '@/hooks/useRealtimeVotes';

interface VoteWidgetProps {
  gameId: string;
  initialCounts: VoteCounts;
  initialUserVote: Vote | null;
  onVoteCast?: (vote: Vote) => void;
  variant?: 'gated' | 'inline'; // gated = blocks reveal until vote
}

export function VoteWidget({
  gameId,
  initialCounts,
  initialUserVote,
  onVoteCast,
  variant = 'inline',
}: VoteWidgetProps) {
  const [userVote, setUserVote] = useState<Vote | null>(initialUserVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const liveCounts = useRealtimeVotes(gameId, initialCounts);

  const submit = (vote: Vote) => {
    setError(null);
    startTransition(async () => {
      try {
        const resp = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, vote }),
        });
        if (resp.status === 409) {
          // Already voted — pick up the existing vote and proceed.
          setUserVote(vote);
          onVoteCast?.(vote);
          return;
        }
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error ?? 'Vote failed');
        }
        setUserVote(vote);
        onVoteCast?.(vote);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not record vote');
      }
    });
  };

  const total = liveCounts.truth + liveCounts.cap;
  const truthPct = total === 0 ? 0 : Math.round((liveCounts.truth / total) * 100);
  const capPct = total === 0 ? 0 : 100 - truthPct;

  return (
    <section
      className={cn(
        'px-6 py-6',
        variant === 'gated' && 'border-y-2 border-fg bg-bg-card'
      )}
    >
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        {userVote ? 'Crowd verdict' : 'Your call · vote to reveal'}
      </p>

      <AnimatePresence mode="wait">
        {!userVote ? (
          <motion.div
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <button
              onClick={() => submit('truth')}
              disabled={pending}
              className="border-2 border-acid text-acid font-display text-3xl font-black uppercase py-6 hover:bg-acid hover:text-bg transition-colors disabled:opacity-50"
            >
              Truth
            </button>
            <button
              onClick={() => submit('cap')}
              disabled={pending}
              className="border-2 border-blood text-blood font-display text-3xl font-black uppercase py-6 hover:bg-blood hover:text-fg transition-colors disabled:opacity-50"
            >
              Cap
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="counts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-mono text-xs tracking-widest uppercase text-acid">
                  Truth · {liveCounts.truth}
                </span>
                <span className="font-mono text-xs text-fg-muted">{truthPct}%</span>
              </div>
              <div className="h-1 bg-line">
                <div className="h-full bg-acid transition-all" style={{ width: `${truthPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-mono text-xs tracking-widest uppercase text-blood">
                  Cap · {liveCounts.cap}
                </span>
                <span className="font-mono text-xs text-fg-muted">{capPct}%</span>
              </div>
              <div className="h-1 bg-line">
                <div className="h-full bg-blood transition-all" style={{ width: `${capPct}%` }} />
              </div>
            </div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              You voted: <span className={userVote === 'truth' ? 'text-acid' : 'text-blood'}>{userVote.toUpperCase()}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
