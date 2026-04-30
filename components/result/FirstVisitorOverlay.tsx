'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FirstVisitorOverlayProps {
  username: string;
  question: string;
}

/** Shown over /game/[id] for first-time visitors before they vote.
 *  Frames the experience: "watch it, decide, then we'll show what AI thinks." */
export function FirstVisitorOverlay({ username, question }: FirstVisitorOverlayProps) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="max-w-md w-full border-2 border-fg bg-bg p-6"
          >
            <div className="tape-stripes h-2 -mx-6 mb-5" />
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3 inline-flex items-center gap-2">
              <Eye className="w-3 h-3" /> Spot the cap
            </p>
            <h2 className="font-display text-3xl font-black leading-[0.95] mb-3">
              @{username} is on trial.
            </h2>
            <p className="font-body text-sm leading-relaxed text-fg-muted mb-2">
              They answered:
            </p>
            <p className="font-display text-lg italic mb-5 leading-snug">
              &ldquo;{question}&rdquo;
            </p>
            <p className="font-body text-sm leading-relaxed text-fg-muted mb-6">
              Watch the clip. Vote truth or cap. Then we reveal what the AI saw.
            </p>
            <Button onClick={() => setDismissed(true)} size="xl" fullWidth>
              Watch the evidence →
            </Button>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-4">
              No signup needed · Anonymous voting
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
