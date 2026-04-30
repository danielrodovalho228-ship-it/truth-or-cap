'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickRandomQuestion } from '@/lib/questions';

interface PlayCTAProps {
  opponentUsername: string;
  opponentSusLevel: number;
  fromGameId: string;
}

/** Challenge-back CTA for FIRST_VISITOR / RETURNING_VIEWER after their vote.
 *  This is the K-factor amplifier — pre-fill a question + opponent context. */
export function PlayCTA({ opponentUsername, opponentSusLevel, fromGameId }: PlayCTAProps) {
  const question = pickRandomQuestion();
  const href = `/game/new?question=${encodeURIComponent(question)}&from=${fromGameId}&opponent=${encodeURIComponent(opponentUsername)}`;
  const verdict = opponentSusLevel >= 70 ? 'BUSTED' : opponentSusLevel < 40 ? 'CONVINCED THE AI' : 'ON THE FENCE';

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.0, duration: 0.5 }}
      className="px-6 py-6 border-y-2 border-mustard bg-bg"
    >
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
        Challenge back
      </p>
      <p className={cn(
        'font-display text-2xl font-black leading-tight mb-1',
        opponentSusLevel >= 70 && 'text-blood',
        opponentSusLevel < 40 && 'text-acid'
      )}>
        @{opponentUsername} — {verdict}
      </p>
      <p className="font-display text-base text-fg-muted leading-snug mb-4">
        Beat their score. Same 30 seconds. Different question.
      </p>
      <p className="border-l-2 border-tape pl-3 py-1 mb-4">
        <span className="font-mono text-[10px] tracking-widest uppercase text-fg-muted block mb-1">
          Your question
        </span>
        <span className="font-display text-lg leading-snug">&ldquo;{question}&rdquo;</span>
      </p>
      <Link
        href={href}
        className="border-2 border-fg bg-fg text-bg px-6 py-4 font-display text-xl font-black uppercase tracking-tight hover:bg-bg hover:text-fg transition-colors inline-flex items-center gap-2 w-full justify-center"
      >
        <Video className="w-5 h-5" /> Record · 30 sec
      </Link>
    </motion.section>
  );
}
