'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dices, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VideoRecorder } from '@/components/recorder/VideoRecorder';
import { pickQuestionFor, type GameType } from '@/lib/game-types';
import { cn } from '@/lib/utils';
import type { Vote } from '@/lib/types';

interface NewGameClientProps {
  initialQuestion: string;
  questionLocked: boolean;
  opponent: string | null;
  fromGameId: string | null;
  gameTypeId: GameType;
  gameTypeLabel: string;
  defaultDurationMs: number;
}

type Phase = 'setup' | 'record';

export function NewGameClient({
  initialQuestion,
  questionLocked,
  opponent,
  fromGameId,
  gameTypeId,
  gameTypeLabel,
  defaultDurationMs,
}: NewGameClientProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [declaredAnswer, setDeclaredAnswer] = useState<Vote | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');

  if (phase === 'record' && declaredAnswer) {
    return (
      <VideoRecorder
        question={question}
        declaredAnswer={declaredAnswer}
        maxDurationMs={defaultDurationMs}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          {opponent ? `Challenge from @${opponent}` : gameTypeLabel}
        </p>

        <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-3">
          Answer.<br />
          <span className="italic font-light">Maybe truthfully.</span>
        </h1>

        <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
          Pick a question, declare your answer (truth or cap), then record up to 30 seconds. The AI
          analyzes voice, face, and language. Friends vote. Lies get exposed.
        </p>

        {/* Question card */}
        <div className="border-2 border-fg p-5 mb-3">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
            Question
          </p>
          <p className="font-display text-2xl leading-snug">&ldquo;{question}&rdquo;</p>
        </div>

        {!questionLocked && (
          <button
            onClick={() => setQuestion(pickQuestionFor(gameTypeId, question))}
            className="self-center font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg inline-flex items-center gap-2 mb-7"
          >
            <Dices className="w-3 h-3" /> Different question
          </button>
        )}

        {/* Truth / Cap toggle */}
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
          Your declared answer
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={() => setDeclaredAnswer('truth')}
            className={cn(
              'border-2 py-5 font-display text-2xl font-black uppercase transition-colors',
              declaredAnswer === 'truth'
                ? 'border-acid bg-acid text-bg'
                : 'border-acid text-acid hover:bg-acid/10'
            )}
            aria-pressed={declaredAnswer === 'truth'}
          >
            Truth
          </button>
          <button
            type="button"
            onClick={() => setDeclaredAnswer('cap')}
            className={cn(
              'border-2 py-5 font-display text-2xl font-black uppercase transition-colors',
              declaredAnswer === 'cap'
                ? 'border-blood bg-blood text-fg'
                : 'border-blood text-blood hover:bg-blood/10'
            )}
            aria-pressed={declaredAnswer === 'cap'}
          >
            Cap
          </button>
        </div>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-7 leading-relaxed">
          What you claim. The AI + your friends decide if your face/voice agrees.
        </p>

        {/* Start CTA */}
        <Button
          onClick={() => setPhase('record')}
          size="xl"
          fullWidth
          disabled={!declaredAnswer}
          className="mt-auto"
        >
          {declaredAnswer ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Video className="w-5 h-5" /> Record · 30 sec
            </span>
          ) : (
            'Pick truth or cap →'
          )}
        </Button>

        {fromGameId ? (
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-4">
            Returning a challenge from @{opponent}
          </p>
        ) : null}

        {/* Tiny accountability line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-4"
        >
          Entertainment only · Not a real lie detector
        </motion.p>
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
