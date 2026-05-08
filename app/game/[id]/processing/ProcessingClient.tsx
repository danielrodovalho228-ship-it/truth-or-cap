'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Mic, Video, MessagesSquare, Search, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { DramaticReveal } from '@/components/processing/DramaticReveal';
import type { Lang } from '@/lib/i18n/messages';

interface ProcessingClientProps {
  gameId: string;
  question: string;
  mode?: 'text' | 'video';
  lang: Lang;
}

const VIDEO_STAGES = [
  { icon: Mic, label: 'Listening for voice tension', color: 'text-mustard' },
  { icon: Video, label: 'Reading facial signals', color: 'text-tape' },
  { icon: MessagesSquare, label: 'Parsing what you said', color: 'text-acid' },
  { icon: Brain, label: 'Calculating SUS LEVEL', color: 'text-blood' },
];

const TEXT_STAGES = [
  { icon: FileText, label: 'Reading your statement', color: 'text-mustard' },
  { icon: Search, label: 'Scanning for hedging', color: 'text-tape' },
  { icon: MessagesSquare, label: 'Parsing what you wrote', color: 'text-acid' },
  { icon: Brain, label: 'Calculating SUS LEVEL', color: 'text-blood' },
];

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 90_000;

export function ProcessingClient({ gameId, question, mode = 'video', lang }: ProcessingClientProps) {
  const stages = mode === 'text' ? TEXT_STAGES : VIDEO_STAGES;
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revealSus, setRevealSus] = useState<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const revealedRef = useRef(false);

  // Drive the visual stage cycle so it feels alive.
  useEffect(() => {
    if (revealSus !== null) return;
    const id = window.setInterval(() => {
      setStage((s) => (s + 1) % stages.length);
      setElapsed(Date.now() - startedAtRef.current);
    }, 2_200);
    return () => window.clearInterval(id);
  }, [stages.length, revealSus]);

  // Poll Supabase for the analysis row.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const check = async () => {
      const { data, error: dbErr } = await supabase
        .from('analyses')
        .select('id, sus_level')
        .eq('game_id', gameId)
        .maybeSingle();

      if (cancelled) return;
      if (dbErr) {
        console.error('[processing] poll error:', dbErr);
        return;
      }
      if (data?.id && !revealedRef.current) {
        revealedRef.current = true;
        setRevealSus(typeof data.sus_level === 'number' ? data.sus_level : 50);
      }
    };

    const id = window.setInterval(() => {
      if (cancelled) return;
      void check();

      // Bail out cleanly after timeout.
      if (Date.now() - startedAtRef.current > TIMEOUT_MS) {
        window.clearInterval(id);
        setError('Analysis is taking longer than expected. Refresh in a moment.');
      }
    }, POLL_INTERVAL_MS);

    // Run immediately once.
    void check();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gameId]);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full text-center relative">
        {/* Suspense-build scanning sweep — runs continuously while waiting */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 overflow-hidden">
          <motion.div
            aria-hidden="true"
            initial={{ y: '-20%' }}
            animate={{ y: '120%' }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 right-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(91,108,246,0.45) 50%, transparent 100%)',
            }}
          />
        </div>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Analysis in progress
        </p>

        <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
          Don&apos;t<br />
          <span className="italic font-light">flinch.</span>
        </h1>

        <p className="font-body text-sm text-fg-muted leading-relaxed mb-10 max-w-sm">
          {mode === 'text'
            ? 'Claude is reading your statement for tells. Usually under 10 seconds.'
            : 'Four AI models inspecting your evidence. Average time 15-30 seconds.'}
        </p>

        <div className="space-y-4 w-full max-w-xs mb-10">
          {stages.map((s, i) => {
            const Icon = s.icon;
            const active = stage === i;
            return (
              <motion.div
                key={i}
                animate={{
                  opacity: active ? 1 : 0.35,
                  scale: active ? 1 : 0.95,
                }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span
                  className={cn(
                    'w-10 h-10 border-2 flex items-center justify-center flex-shrink-0',
                    active ? 'border-fg' : 'border-line'
                  )}
                >
                  <Icon className={cn('w-5 h-5', active ? s.color : 'text-fg-muted')} />
                </span>
                <span
                  className={cn(
                    'font-mono text-xs tracking-widest uppercase text-left',
                    active ? 'text-fg' : 'text-fg-muted'
                  )}
                >
                  {s.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
          Question on trial
        </p>
        <p className="font-display text-base text-fg-muted italic max-w-xs leading-snug mb-6">
          &ldquo;{question}&rdquo;
        </p>

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          {Math.floor(elapsed / 1000)}s elapsed
        </p>

        {error ? (
          <div className="mt-6 border-2 border-blood p-4 max-w-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-blood mb-2">
              Slow analysis
            </p>
            <p className="font-body text-sm text-fg leading-snug">{error}</p>
          </div>
        ) : null}
      </div>

      <div className="tape-stripes h-3 w-full" />

      {revealSus !== null ? (
        <DramaticReveal
          susLevel={revealSus}
          lang={lang}
          onComplete={() => router.replace(`/game/${gameId}`)}
        />
      ) : null}
    </main>
  );
}
