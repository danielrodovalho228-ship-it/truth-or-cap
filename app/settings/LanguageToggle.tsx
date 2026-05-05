'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/messages';

interface Props {
  initial: Lang;
}

export function LanguageToggle({ initial }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<Lang>(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setActive(initial);
  }, [initial]);

  const setLang = (lang: Lang) => {
    if (lang === active || pending) return;
    setActive(lang);
    startTransition(async () => {
      try {
        await fetch('/api/lang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang }),
        });
      } catch { /* offline — server cookie will be set on next request */ }
      router.refresh();
    });
  };

  return (
    <div className="border-2 border-line p-3">
      <p className="font-display text-base font-black uppercase tracking-tight mb-1">Language</p>
      <p className="font-mono text-[10px] tracking-widest uppercase opacity-70 mb-3">
        Pick your interface language
      </p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Language">
        <Option
          label="EN"
          subtitle="English"
          flag="🇺🇸"
          active={active === 'en'}
          onClick={() => setLang('en')}
        />
        <Option
          label="PT"
          subtitle="Português"
          flag="🇧🇷"
          active={active === 'pt'}
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
  onClick,
}: {
  label: string;
  subtitle: string;
  flag: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'border-2 py-3 px-3 flex items-center gap-3 transition-colors',
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
