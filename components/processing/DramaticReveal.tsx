'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/messages';

interface DramaticRevealProps {
  susLevel: number;
  lang: Lang;
  onComplete: () => void;
}

const COPY = {
  en: {
    locked: 'EVIDENCE LOCKED',
    verdictLabel: 'AI VERDICT',
    busted: 'CAP DETECTED 🧢',
    truth: 'TRUTH 💚',
    susLine: (n: number) => `${n}% SUS`,
    redirect: 'Loading evidence room…',
  },
  pt: {
    locked: 'EVIDÊNCIA TRAVADA',
    verdictLabel: 'VEREDITO DA IA',
    busted: 'CAP DETECTADO 🧢',
    truth: 'VERDADE 💚',
    susLine: (n: number) => `${n}% SUS`,
    redirect: 'Abrindo a sala de evidências…',
  },
} as const;

// Total dramatic-reveal duration ≈ 2.6s. Keep under 4s end-to-end.
const PHASE_FLASH_MS = 240;
const PHASE_COUNTER_MS = 1400;
const PHASE_HOLD_MS = 900;

export function DramaticReveal({ susLevel, lang, onComplete }: DramaticRevealProps) {
  const isCap = susLevel >= 50;
  const t = COPY[lang];
  const [phase, setPhase] = useState<'flash' | 'count' | 'hold'>('flash');
  const completedRef = useRef(false);

  // Animated counter.
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  // Phase scheduler.
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const flashTimer = window.setTimeout(() => setPhase('count'), PHASE_FLASH_MS);
    const holdTimer = window.setTimeout(
      () => setPhase('hold'),
      PHASE_FLASH_MS + (reduced ? 200 : PHASE_COUNTER_MS),
    );
    const finishTimer = window.setTimeout(
      () => {
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete();
      },
      PHASE_FLASH_MS + (reduced ? 200 : PHASE_COUNTER_MS) + PHASE_HOLD_MS,
    );

    return () => {
      window.clearTimeout(flashTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onComplete]);

  // Counter animation.
  useEffect(() => {
    if (phase !== 'count') return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setDisplay(susLevel);
      return;
    }

    const unsub = rounded.on('change', (v) => setDisplay(v));
    const controls = animate(count, susLevel, {
      duration: PHASE_COUNTER_MS / 1000,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => {
      unsub();
      controls.stop();
    };
  }, [phase, susLevel, count, rounded]);

  // Confetti / haptics on the final hold phase.
  useEffect(() => {
    if (phase !== 'hold') return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(isCap ? [80, 40, 80, 40, 120] : [40, 30, 40]);
      } catch {
        /* ignore */
      }
    }

    if (!reduced) {
      const colors = isCap ? ['#f87171', '#5b6cf6'] : ['#14b8a6', '#5b6cf6'];
      try {
        void confetti({
          particleCount: isCap ? 60 : 100,
          spread: isCap ? 50 : 90,
          startVelocity: isCap ? 35 : 45,
          origin: { y: 0.55 },
          colors,
        });
      } catch {
        /* ignore */
      }
    }
  }, [phase, isCap]);

  const accent = isCap ? '#f87171' : '#14b8a6';
  const verdictText = isCap ? t.busted : t.truth;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={verdictText}
    >
      {/* Dramatic backdrop */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${accent}55 0%, rgba(10,14,26,0) 65%)`,
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Scanning sweep line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        initial={{ y: '-30%', opacity: 0 }}
        animate={{ y: '130%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, ease: 'linear', repeat: 1 }}
      />

      {/* White flash on entry — evokes the "shutter snap" feel */}
      <AnimatePresence>
        {phase === 'flash' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-white pointer-events-none"
          />
        ) : null}
      </AnimatePresence>

      {/* Screen shake on the final hold for CAP verdicts */}
      <motion.div
        className="relative z-10 text-center px-6"
        animate={
          phase === 'hold' && isCap
            ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
            : undefined
        }
        transition={phase === 'hold' && isCap ? { duration: 0.5 } : undefined}
      >
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-white/60 mb-4"
        >
          {t.locked}
        </motion.p>

        <motion.p
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
          className="font-mono text-xs tracking-[0.4em] uppercase text-white/70 mb-3"
        >
          {t.verdictLabel}
        </motion.p>

        <motion.p
          className={cn(
            'font-display font-black leading-none tabular-nums select-none',
            'text-[160px] md:text-[220px]',
          )}
          style={{ color: accent, textShadow: `0 0 60px ${accent}AA` }}
          animate={
            phase === 'hold'
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          {display}%
        </motion.p>

        <AnimatePresence>
          {phase === 'hold' ? (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="mt-4"
            >
              <span
                className="inline-block px-5 py-2 font-display font-black text-2xl md:text-3xl"
                style={{
                  backgroundColor: accent,
                  color: '#0a0e1a',
                  letterSpacing: '0.02em',
                  boxShadow: `0 12px 40px ${accent}80`,
                }}
              >
                {verdictText}
              </span>
              <p className="mt-6 font-mono text-[10px] tracking-[0.4em] uppercase text-white/40">
                {t.redirect}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
