'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LANGS, type Lang } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

interface LangToggleProps {
  current: Lang;
}

export function LangToggle({ current }: LangToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const swap = (target: Lang) => {
    if (target === current) return;
    startTransition(async () => {
      await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: target }),
      });
      router.refresh();
    });
  };

  return (
    <div className="inline-flex border-2 border-line">
      {LANGS.map((lang) => (
        <button
          key={lang}
          onClick={() => swap(lang)}
          disabled={pending}
          className={cn(
            'px-2 py-1 font-mono text-[10px] tracking-widest uppercase transition-colors',
            current === lang ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg'
          )}
          aria-pressed={current === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
