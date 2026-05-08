'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GameBanner } from '@/components/layout/GameBanner';
import { WyrVoteCard } from '@/components/wyr/WyrVoteCard';
import { GAME_TYPES, pickWyrPrompt, type WYRPrompt, type Audience } from '@/lib/game-types';
import { buildWyrStats, type WYRChoice, type WYRStats } from '@/lib/wyr';

interface Props {
  initialPrompt: WYRPrompt;
  initialStats: WYRStats;
  initialChoice: WYRChoice | null;
  audience: Audience | null;
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  family: 'Family',
  friends: 'Friends',
  couples: 'Couples',
};

/**
 * Client wrapper for the WYR vote experience. Handles reroll (which fires
 * a client-side fetch for the new prompt's stats) so we don't need a full
 * page navigation per question.
 */
export function WyrClient({ initialPrompt, initialStats, initialChoice, audience }: Props) {
  const [prompt, setPrompt] = useState<WYRPrompt>(initialPrompt);
  const [stats, setStats] = useState<WYRStats>(initialStats);
  const [choice, setChoice] = useState<WYRChoice | null>(initialChoice);

  useEffect(() => {
    setPrompt(initialPrompt);
    setStats(initialStats);
    setChoice(initialChoice);
  }, [initialPrompt, initialStats, initialChoice]);

  async function pickAnother() {
    const next = pickWyrPrompt({
      exclude: prompt.id,
      audience: audience ?? undefined,
    });
    setPrompt(next);
    setChoice(null);
    // Reset to a zero stats card immediately so the bars don't carry over.
    setStats(buildWyrStats({ questionId: next.id, votesA: 0, votesB: 0, total: 0 }));

    try {
      const res = await fetch(`/api/wyr/stats?questionId=${encodeURIComponent(next.id)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: true; stats: WYRStats };
      setStats(data.stats);
    } catch {
      // Silent fail — the user can still vote; the next vote refreshes stats.
    }
  }

  const theme = GAME_TYPES.would_you_rather.theme;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
        <GameBanner
          variant="hero"
          theme={theme}
          title="Would You Rather"
          subtitle={audience ? `${AUDIENCE_LABEL[audience]} mode` : 'Pick a side'}
        />

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          {audience ? `${AUDIENCE_LABEL[audience]} mode` : 'A or B'}
        </p>

        <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-3">
          Pick a side.<br />
          <span className="italic font-light">See where the world lands.</span>
        </h1>

        <p className="font-body text-base text-fg-muted leading-relaxed mb-6 max-w-sm">
          Vote A or B. We&apos;ll show you live percentages and tell you if you sided with the crowd
          or went rogue.
        </p>

        <WyrVoteCard
          prompt={prompt}
          initialStats={stats}
          initialChoice={choice}
          onPickAnother={pickAnother}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-auto"
        >
          Entertainment only · Aggregated votes only · No personal data shown
        </motion.p>
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
