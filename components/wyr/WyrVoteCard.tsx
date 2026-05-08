'use client';

import { useEffect, useRef, useState } from 'react';
import { Dices, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { describeWyrInsight, type WYRChoice, type WYRStats } from '@/lib/wyr';
import type { WYRPrompt } from '@/lib/game-types';

interface Props {
  prompt: WYRPrompt;
  initialStats: WYRStats;
  initialChoice: WYRChoice | null;
  onPickAnother: () => void;
}

/**
 * Vote on a Would-You-Rather prompt and watch the live tally update.
 * Optimistic UI: we move the bar immediately when the user picks, then
 * reconcile with the server's authoritative stats once the request lands.
 */
export function WyrVoteCard({
  prompt,
  initialStats,
  initialChoice,
  onPickAnother,
}: Props) {
  const [choice, setChoice] = useState<WYRChoice | null>(initialChoice);
  const [stats, setStats] = useState<WYRStats>(initialStats);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedFor = useRef<string>(prompt.id);

  // When the parent rerolls the prompt, reset choice / stats.
  useEffect(() => {
    if (lastFetchedFor.current === prompt.id) return;
    lastFetchedFor.current = prompt.id;
    setChoice(initialChoice);
    setStats(initialStats);
    setError(null);
  }, [prompt.id, initialStats, initialChoice]);

  async function vote(pick: WYRChoice) {
    if (pending) return;
    setError(null);
    setPending(true);

    // Optimistic: assume +1 on the picked side. If the user is changing
    // their mind, also subtract from the other side (their last vote
    // moves over server-side via the upsert).
    const wasChoice = choice;
    setChoice(pick);
    setStats((prev) => optimisticTally(prev, wasChoice, pick));

    try {
      const res = await fetch('/api/wyr/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: prompt.id, choice: pick }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error ?? 'Vote failed');
      }
      const data = (await res.json()) as { ok: true; stats: WYRStats; choice: WYRChoice };
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setChoice(wasChoice);
      setStats(initialStats);
    } finally {
      setPending(false);
    }
  }

  const hasVoted = choice !== null;
  const insight = hasVoted ? describeWyrInsight(choice, stats) : null;
  const totalLabel =
    stats.total === 0
      ? 'Be the first to vote'
      : stats.total === 1
        ? '1 person has answered this'
        : `${stats.total.toLocaleString()} people have answered this`;

  return (
    <div className="rounded-2xl border-2 border-fg p-5 mb-6 relative overflow-hidden bg-bg-card">
      <span
        aria-hidden="true"
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-2xl"
        style={{ backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)' }}
      />
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
        Would you rather
      </p>
      <p className="font-display text-2xl leading-snug mb-5">
        &ldquo;{prompt.question}&rdquo;
      </p>

      {/* A / B options ------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <OptionButton
          label="A"
          text={prompt.optionA}
          accent="acid"
          isPicked={choice === 'A'}
          isDimmed={hasVoted && choice !== 'A'}
          pct={hasVoted ? stats.pctA : null}
          disabled={pending}
          onClick={() => vote('A')}
        />
        <OptionButton
          label="B"
          text={prompt.optionB}
          accent="blood"
          isPicked={choice === 'B'}
          isDimmed={hasVoted && choice !== 'B'}
          pct={hasVoted ? stats.pctB : null}
          disabled={pending}
          onClick={() => vote('B')}
        />
      </div>

      {/* Live counter -------------------------------------------------- */}
      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mb-3">
        {totalLabel}
      </p>

      {/* Insight banner ----------------------------------------------- */}
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border-2 border-fg/10 bg-bg p-4 mb-4"
        >
          <p className="font-display text-base font-black mb-1">{insight.headline}</p>
          <p className="font-body text-sm text-fg-muted leading-relaxed">{insight.subtext}</p>
        </motion.div>
      )}

      {error && (
        <p
          role="alert"
          className="font-mono text-[10px] tracking-widest uppercase text-blood mb-3 text-center"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onPickAnother}
          className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg inline-flex items-center gap-2"
        >
          <Dices className="w-3 h-3" /> Different question
        </button>
        <Link
          href="/wyr/stats"
          className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg inline-flex items-center gap-2"
        >
          <BarChart3 className="w-3 h-3" /> Most polarizing
        </Link>
      </div>
    </div>
  );
}

interface OptionButtonProps {
  label: 'A' | 'B';
  text: string;
  accent: 'acid' | 'blood';
  isPicked: boolean;
  isDimmed: boolean;
  pct: number | null;
  disabled: boolean;
  onClick: () => void;
}

function OptionButton({
  label,
  text,
  accent,
  isPicked,
  isDimmed,
  pct,
  disabled,
  onClick,
}: OptionButtonProps) {
  // Tailwind needs both class fragments visible at build time.
  const accentClasses =
    accent === 'acid'
      ? {
          base: 'border-acid text-acid hover:bg-acid/10',
          picked: 'border-acid bg-acid text-bg',
          fillTrack: 'bg-acid/15',
          fillBar: 'bg-acid',
        }
      : {
          base: 'border-blood text-blood hover:bg-blood/10',
          picked: 'border-blood bg-blood text-bg',
          fillTrack: 'bg-blood/15',
          fillBar: 'bg-blood',
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isPicked}
      className={cn(
        'relative overflow-hidden border-2 px-4 py-5 font-display text-lg font-black uppercase text-left transition-all',
        'disabled:cursor-not-allowed',
        isPicked ? accentClasses.picked : accentClasses.base,
        isDimmed && 'opacity-70'
      )}
    >
      {/* Vote bar fill — only shown after voting */}
      {pct !== null && (
        <span aria-hidden="true" className={cn('absolute inset-0', accentClasses.fillTrack)}>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('absolute inset-y-0 left-0', accentClasses.fillBar, 'opacity-30')}
          />
        </span>
      )}
      <span className="relative flex items-start gap-3">
        <span className="font-mono text-xs tracking-widest opacity-70 mt-1">{label}</span>
        <span className="flex-1">
          <span className="block leading-snug">{text}</span>
          {pct !== null && (
            <span className="block mt-2 font-mono text-xs tracking-wider opacity-80 normal-case">
              {pct.toFixed(0)}% picked this
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function optimisticTally(
  prev: WYRStats,
  was: WYRChoice | null,
  next: WYRChoice
): WYRStats {
  // Fresh vote: +1 on chosen side.
  // Switching sides: +1 on chosen, -1 on previous (server upsert mirrors this).
  let votesA = prev.votesA;
  let votesB = prev.votesB;
  let total = prev.total;

  if (was === null) {
    if (next === 'A') votesA += 1;
    else votesB += 1;
    total += 1;
  } else if (was !== next) {
    if (next === 'A') {
      votesA += 1;
      votesB = Math.max(0, votesB - 1);
    } else {
      votesB += 1;
      votesA = Math.max(0, votesA - 1);
    }
  } else {
    // Re-affirming the same vote — no change.
    return prev;
  }

  const pctA = total > 0 ? Math.round((votesA / total) * 1000) / 10 : 0;
  const pctB = total > 0 ? Math.round((votesB / total) * 1000) / 10 : 0;

  return {
    questionId: prev.questionId,
    votesA,
    votesB,
    total,
    pctA,
    pctB,
  };
}
