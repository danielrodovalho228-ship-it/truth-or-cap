'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface SusLevelRevealProps {
  susLevel: number;
  userVote?: 'truth' | 'cap' | null;
  declaredAnswer: 'truth' | 'cap';
}

function verdictText(sus: number): string {
  if (sus >= 85) return 'Busted.';
  if (sus >= 70) return 'Probably capping.';
  if (sus >= 40) return 'On the fence.';
  if (sus >= 15) return 'Probably truth.';
  return 'Convinced the AI.';
}

function colorFor(sus: number): string {
  if (sus >= 70) return 'text-blood';
  if (sus >= 40) return 'text-mustard';
  return 'text-acid';
}

function fireConfetti(sus: number) {
  if (typeof window === 'undefined') return;
  const colors = sus >= 70 ? ['#dc2626', '#fbbf24'] : ['#a8ff00', '#fef08a'];
  void confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
  });
}

export function SusLevelReveal({ susLevel, userVote, declaredAnswer }: SusLevelRevealProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotionRef.current) {
      setDisplay(susLevel);
      return;
    }

    const unsub = rounded.on('change', (v) => setDisplay(v));
    const controls = animate(count, susLevel, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo-ish
    });

    let confettiTimer: number | null = null;
    if (susLevel >= 85 || susLevel <= 15) {
      confettiTimer = window.setTimeout(() => fireConfetti(susLevel), 1700);
    }

    return () => {
      unsub();
      controls.stop();
      if (confettiTimer) window.clearTimeout(confettiTimer);
    };
  }, [count, rounded, susLevel]);

  // "Aligned" check: if user voted same as AI's leaning.
  const aiLeansCap = susLevel >= 50;
  const userSaidCap = userVote === 'cap';
  const aligned = userVote ? aiLeansCap === userSaidCap : null;

  return (
    <section className="px-6 py-8">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3"
      >
        AI Verdict
      </motion.p>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 18 }}
        className="border-2 border-fg p-6 mb-5"
      >
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-1">
          SUS LEVEL
        </p>
        <p className={cn('font-display text-8xl font-black leading-none tabular-nums', colorFor(susLevel))}>
          {display}%
        </p>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
          className="font-display text-2xl italic mt-3"
        >
          {verdictText(susLevel)}
        </motion.p>
      </motion.div>

      {aligned !== null ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
          className={cn(
            'font-mono text-xs tracking-widest uppercase mb-3',
            aligned ? 'text-acid' : 'text-blood'
          )}
        >
          {aligned ? '✓ You aligned with the AI' : '✗ You disagreed with the AI'}
        </motion.p>
      ) : null}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.0 }}
        className="font-mono text-[10px] tracking-widest uppercase text-fg-muted leading-relaxed"
      >
        Entertainment only · Not a real lie detector
        <br />
        Player declared: <span className="text-fg">{declaredAnswer.toUpperCase()}</span>
      </motion.p>
    </section>
  );
}
