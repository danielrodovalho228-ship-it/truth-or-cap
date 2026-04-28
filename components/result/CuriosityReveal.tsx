'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createInvite } from '@/lib/invites';

interface CuriosityRevealProps {
  gameId: string;
  alreadySent: number;
}

const TARGET = 3;

/** Locked feature card shown after first game on result page (M07). */
export function CuriosityReveal({ gameId, alreadySent }: CuriosityRevealProps) {
  const [count, setCount] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = Math.max(0, TARGET - count);

  const handleInvite = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { url, message } = await createInvite({
          context: 'curiosity',
          channel: 'native_share',
          sourceGameId: gameId,
        });
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
          await navigator.share({ text: message, url });
        } else {
          await navigator.clipboard.writeText(message);
        }
        setCount((n) => n + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send invite');
      }
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.2 }}
      className="px-6 py-6 border-2 border-tape bg-bg-card mx-6"
    >
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-tape mb-2 inline-flex items-center gap-2">
        <Lock className="w-3 h-3" /> Locked feature
      </p>
      <p className="font-display text-2xl font-black leading-tight mb-2">
        Who in your contacts can flag your lies?
      </p>
      <p className="font-body text-sm text-fg-muted mb-4 leading-snug">
        Invite {remaining > 0 ? remaining : 'a few more'} to unlock the personal Detector Map of your circle.
      </p>
      <Button onClick={handleInvite} size="lg" fullWidth disabled={pending || remaining === 0}>
        {remaining === 0
          ? 'Unlocked! Refresh to see your map'
          : pending
          ? 'Sharing…'
          : `Invite friend (${count}/${TARGET})`}
      </Button>
      {error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </motion.section>
  );
}
