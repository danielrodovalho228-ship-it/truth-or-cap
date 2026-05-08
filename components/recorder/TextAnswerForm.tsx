'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Vote } from '@/lib/types';

interface TextAnswerFormProps {
  question: string;
  declaredAnswer: Vote;
  /** Locale-prefixed result route (default '/game'). The PT route uses '/jogo'. */
  resultBasePath?: string;
}

const MAX_CHARS = 1000;
const MIN_CHARS = 8;

type Status = 'idle' | 'submitting' | 'analyzing' | 'error';

export function TextAnswerForm({
  question,
  declaredAnswer,
  resultBasePath = '/game',
}: TextAnswerFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const charCount = text.length;
  const trimmedLen = text.trim().length;
  const tooShort = trimmedLen > 0 && trimmedLen < MIN_CHARS;
  const canSubmit = trimmedLen >= MIN_CHARS && status === 'idle';

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setStatus('submitting');
    setError(null);

    try {
      const resp = await fetch('/api/text/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          declaredAnswer,
          textAnswer: text.trim(),
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? 'Submit failed');
      }
      const { gameId } = (await resp.json()) as { gameId: string };

      // Trigger analysis (fire-and-forget — processing screen polls).
      void fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      setStatus('analyzing');
      router.push(`${resultBasePath}/${gameId}/processing`);
    } catch (err) {
      console.error('[TextAnswerForm] submit failed:', err);
      setError(err instanceof Error ? err.message : 'Something broke. Try again.');
      setStatus('error');
    }
  }, [canSubmit, question, declaredAnswer, text, resultBasePath, router]);

  const isWorking = status === 'submitting' || status === 'analyzing';

  return (
    <div className="min-h-[100svh] bg-bg flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-1">
          You declared:{' '}
          <span className={declaredAnswer === 'truth' ? 'text-acid' : 'text-blood'}>
            {declaredAnswer.toUpperCase()}
          </span>
        </p>

        <h1 className="font-display text-3xl md:text-4xl font-black leading-tight mb-2">
          Type your answer.
        </h1>
        <p className="font-body text-sm text-fg-muted leading-relaxed mb-5">
          Defend your call. The AI scans your words for hedging, defensive phrases, and
          tells. Be specific — vague answers read suspicious.
        </p>

        <div className="rounded-2xl border-2 border-fg p-4 mb-5 bg-bg-card">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Question
          </p>
          <p className="font-display text-lg leading-snug">&ldquo;{question}&rdquo;</p>
        </div>

        <label
          htmlFor="text-answer"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2"
        >
          Your answer
        </label>
        <textarea
          ref={textareaRef}
          id="text-answer"
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, MAX_CHARS));
            if (status === 'error') {
              setStatus('idle');
              setError(null);
            }
          }}
          rows={6}
          maxLength={MAX_CHARS}
          disabled={isWorking}
          placeholder="Tell us your side. Be specific — vague answers look sus."
          className="w-full px-4 py-3 border-2 border-line bg-bg text-fg font-body text-base leading-relaxed rounded-xl resize-none focus:outline-none focus:border-fg disabled:opacity-50"
          aria-describedby="text-answer-hint"
        />
        <div
          id="text-answer-hint"
          className="flex items-center justify-between mt-2 font-mono text-[10px] tracking-widest uppercase"
        >
          <span className={tooShort ? 'text-blood' : 'text-fg-muted'}>
            {tooShort ? `Min ${MIN_CHARS} chars` : 'Be specific. Type freely.'}
          </span>
          <span className={charCount >= MAX_CHARS - 50 ? 'text-blood' : 'text-fg-muted'}>
            {charCount} / {MAX_CHARS}
          </span>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 px-4 py-3 border-2 border-blood bg-blood/10 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-blood mt-0.5 flex-shrink-0" />
            <p className="font-mono text-xs tracking-widest uppercase text-blood">{error}</p>
          </div>
        ) : null}

        <Button
          onClick={submit}
          size="xl"
          fullWidth
          disabled={!canSubmit}
          className="mt-6"
        >
          {isWorking ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              {status === 'analyzing' ? 'Routing to analysis…' : 'Submitting…'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 justify-center">
              <Send className="w-5 h-5" /> Send for analysis
            </span>
          )}
        </Button>

        <button
          type="button"
          onClick={() => router.back()}
          disabled={isWorking}
          className="mt-4 self-center font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg disabled:opacity-50"
        >
          Cancel
        </button>

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-4">
          Entertainment only · Not a real lie detector
        </p>
      </div>

      <div className="tape-stripes h-3 w-full" />
    </div>
  );
}
