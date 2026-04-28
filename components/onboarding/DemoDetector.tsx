'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Hard-coded demo. Daniel will replace with a real seeded game later — for now
// this gives the user the feel of vote → reveal so the funnel reads right.
const DEMO = {
  question: "Have you ever lied about reading a book everyone's talking about?",
  declared_answer: 'truth' as const,
  sus_level: 73,
  reasons: [
    { signal: 'Voice tension on key word', category: 'voice' },
    { signal: 'Eye flicker before answer', category: 'face' },
    { signal: 'Hedging language detected', category: 'language' },
  ],
};

interface DemoDetectorProps {
  onContinue: () => void;
}

type Phase = 'watch' | 'vote' | 'reveal';

export function DemoDetector({ onContinue }: DemoDetectorProps) {
  const [phase, setPhase] = useState<Phase>('watch');
  const [vote, setVote] = useState<'truth' | 'cap' | null>(null);
  const aligned = vote === DEMO.declared_answer
    ? DEMO.sus_level < 50
    : DEMO.sus_level >= 50; // crude — real result page does the proper math

  return (
    <div className="flex-1 flex flex-col">
      {/* Mock video evidence */}
      <div className="relative aspect-[9/16] max-h-72 bg-bg-card border-2 border-line mb-4 overflow-hidden flex items-center justify-center">
        <div className="ruler-marks absolute inset-0 opacity-30" />
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted text-center px-3">
          [demo evidence — your actual videos play here]
        </p>
        <div className="absolute top-2 left-2 font-mono text-[10px] uppercase tracking-widest text-mustard">
          REC · 00:14
        </div>
      </div>

      <p className="font-display text-xl leading-snug mb-5">
        &ldquo;{DEMO.question}&rdquo;
      </p>

      <AnimatePresence mode="wait">
        {phase === 'watch' && (
          <motion.div
            key="watch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              They said: <span className="text-fg">truth</span>
            </p>
            <Button onClick={() => setPhase('vote')} size="lg" fullWidth>
              I watched · Now let me vote
            </Button>
          </motion.div>
        )}

        {phase === 'vote' && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard">
              Your call
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setVote('truth');
                  setPhase('reveal');
                }}
                className="border-2 border-acid text-acid font-display text-2xl font-black uppercase py-5 hover:bg-acid hover:text-bg transition-colors"
              >
                Truth
              </button>
              <button
                onClick={() => {
                  setVote('cap');
                  setPhase('reveal');
                }}
                className="border-2 border-blood text-blood font-display text-2xl font-black uppercase py-5 hover:bg-blood hover:text-fg transition-colors"
              >
                Cap
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
              AI Verdict
            </p>
            <div className="border-2 border-fg p-5">
              <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-1">
                SUS LEVEL
              </p>
              <p
                className={cn(
                  'font-display text-7xl font-black leading-none',
                  DEMO.sus_level >= 70 && 'text-blood',
                  DEMO.sus_level >= 40 && DEMO.sus_level < 70 && 'text-mustard',
                  DEMO.sus_level < 40 && 'text-acid'
                )}
              >
                {DEMO.sus_level}%
              </p>
              <p className="font-display text-lg italic mt-2">
                {DEMO.sus_level >= 70 ? 'Probably capping.' : DEMO.sus_level < 40 ? 'Probably truth.' : 'On the fence.'}
              </p>
            </div>

            <ul className="space-y-2">
              {DEMO.reasons.map((r) => (
                <li key={r.signal} className="border-l-2 border-mustard pl-3 py-1">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-mustard">
                    {r.category}
                  </p>
                  <p className="font-body text-sm">{r.signal}</p>
                </li>
              ))}
            </ul>

            <p className={cn('font-mono text-xs tracking-widest uppercase', aligned ? 'text-acid' : 'text-blood')}>
              {aligned ? '✓ You aligned with the AI' : '✗ You disagreed with the AI'}
            </p>

            <Button onClick={onContinue} size="xl" fullWidth>
              Got it →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
