'use client';

import { useState } from 'react';
import { LANGS, type Lang } from '@/lib/i18n/messages';
import { localizePath } from '@/lib/i18n/paths';
import { cn } from '@/lib/utils';

interface LangToggleProps {
  current: Lang;
}

export function LangToggle({ current }: LangToggleProps) {
  const [pending, setPending] = useState(false);

  const swap = async (target: Lang) => {
    if (target === current || pending) return;
    setPending(true);
    try {
      await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: target }),
      });
    } catch {
      /* best-effort */
    }
    if (typeof window !== 'undefined') {
      const next = localizePath(window.location.pathname, target) + window.location.search + window.location.hash;
      window.location.assign(next);
    }
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
