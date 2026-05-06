'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/messages';
import { localizePath } from '@/lib/i18n/paths';

interface Props {
  initial: Lang;
  title: string;
  subtitle: string;
}

export function LanguageToggle({ initial, title, subtitle }: Props) {
  const [active, setActive] = useState<Lang>(initial);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setActive(initial);
  }, [initial]);

  const setLang = async (lang: Lang) => {
    if (lang === active || pending) return;
    setPending(true);
    try {
      await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
    } catch {
      /* offline — best-effort, hard reload still picks up the cookie next time */
    }
    // Hard reload to the localized version of the current page. This bypasses
    // React's transition state (avoids the freeze users reported), forces a
    // fresh server render with the new cookie, and swaps EN/PT route segments
    // in one shot (e.g. /amigos → /friends when switching to EN).
    if (typeof window !== 'undefined') {
      const next = localizePath(window.location.pathname, lang) + window.location.search + window.location.hash;
      window.location.assign(next);
    }
  };

  return (
    <div className="border-2 border-line p-3">
      <p className="font-display text-base font-black uppercase tracking-tight mb-1">{title}</p>
      <p className="font-mono text-[10px] tracking-widest uppercase opacity-70 mb-3">
        {subtitle}
      </p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={title}>
        <Option
          label="EN"
          subtitle="English"
          flag="🇺🇸"
          active={active === 'en'}
          disabled={pending}
          onClick={() => setLang('en')}
        />
        <Option
          label="PT"
          subtitle="Português"
          flag="🇧🇷"
          active={active === 'pt'}
          disabled={pending}
          onClick={() => setLang('pt')}
        />
      </div>
    </div>
  );
}

function Option({
  label,
  subtitle,
  flag,
  active,
  disabled,
  onClick,
}: {
  label: string;
  subtitle: string;
  flag: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'border-2 py-3 px-3 flex items-center gap-3 transition-colors disabled:opacity-60',
        active
          ? 'border-mustard bg-mustard text-bg'
          : 'border-line text-fg hover:border-mustard'
      )}
    >
      <span aria-hidden className="text-xl leading-none">{flag}</span>
      <div className="text-left">
        <div className="font-display font-black text-base uppercase tracking-tight">{label}</div>
        <div className={cn(
          'font-mono text-[9px] tracking-widest uppercase',
          active ? 'text-bg/80' : 'text-fg-muted'
        )}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}
