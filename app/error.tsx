'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="tape-stripes h-3 w-full absolute top-0" />
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-blood mb-3">
        Something went sus
      </p>
      <h1 className="font-display text-5xl font-black leading-[0.9] mb-4">
        Hold up.<br />
        <span className="italic font-light">Try that again.</span>
      </h1>
      <p className="font-body text-sm text-fg-muted leading-relaxed max-w-sm mb-6">
        We hit an unexpected error. Refresh, or go home and try a different path.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={reset} size="lg" fullWidth>Try again</Button>
        <Link href="/"><Button variant="ghost" size="md" fullWidth>Back home</Button></Link>
      </div>
      {error.digest ? (
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-6">
          ref · {error.digest}
        </p>
      ) : null}
      <div className="tape-stripes h-3 w-full absolute bottom-0" />
    </main>
  );
}
