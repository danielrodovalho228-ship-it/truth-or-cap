'use client';

import { useState } from 'react';
import { Share2, MessageCircle, Twitter, Link as LinkIcon, Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildShareText, whatsappLink, twitterIntent } from '@/lib/share';
import { ShareCardModal } from './ShareCardModal';
import type { Lang } from '@/lib/i18n/messages';

interface ShareSheetProps {
  username: string;
  question: string;
  susLevel: number;
  declaredAnswer: 'truth' | 'cap';
  url: string;
  lang: Lang;
}

type NavigatorWithShare = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
};

const COPY = {
  en: {
    rail: 'Send to people who will roast you',
    card: 'Make share card',
    cardSub: 'Auto-generated. Drop it in your story.',
    share: 'Share',
    whatsapp: 'WhatsApp',
    x: 'X',
    copy: 'Copy',
    copied: 'Copied',
  },
  pt: {
    rail: 'Manda pra quem vai zoar',
    card: 'Gerar card',
    cardSub: 'Pronto pra story em 1 toque.',
    share: 'Compartilhar',
    whatsapp: 'WhatsApp',
    x: 'X',
    copy: 'Copiar',
    copied: 'Copiado',
  },
} as const;

export function ShareSheet({
  username,
  question,
  susLevel,
  declaredAnswer,
  url,
  lang,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const text = buildShareText({ username, question, susLevel, url });
  const t = COPY[lang];

  const tryNative = async () => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator as NavigatorWithShare;
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: 'Truth or Cap', text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      void copy();
    }
  };

  const copy = async () => {
    try {
      if (typeof window === 'undefined') return;
      const nav = window.navigator;
      if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        await nav.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <>
      <motion.section
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 3.4 }}
        className="sticky bottom-0 left-0 right-0 z-30 px-5 pt-3 pb-5 bg-bg/95 backdrop-blur-sm border-t-2 border-fg"
      >
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3 text-center">
          {t.rail}
        </p>

        <button
          type="button"
          onClick={() => setCardOpen(true)}
          className="block w-full max-w-md mx-auto mb-2 border-2 border-fg bg-fg text-bg hover:bg-bg hover:text-fg transition-colors px-4 py-3 text-left"
        >
          <span className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">
              <span className="block font-display text-lg font-black leading-tight">
                {t.card}
              </span>
              <span className="block font-mono text-[10px] tracking-widest uppercase opacity-80">
                {t.cardSub}
              </span>
            </span>
          </span>
        </button>

        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          <ShareButton onClick={tryNative} icon={<Share2 className="w-4 h-4" />} label={t.share} />
          <ShareButton href={whatsappLink(text)} icon={<MessageCircle className="w-4 h-4" />} label={t.whatsapp} />
          <ShareButton href={twitterIntent(text, url)} icon={<Twitter className="w-4 h-4" />} label={t.x} />
          <ShareButton
            onClick={copy}
            icon={copied ? <Check className="w-4 h-4 text-acid" /> : <LinkIcon className="w-4 h-4" />}
            label={copied ? t.copied : t.copy}
          />
        </div>
      </motion.section>

      <ShareCardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        username={username}
        question={question}
        susLevel={susLevel}
        declaredAnswer={declaredAnswer}
        url={url}
        lang={lang}
      />
    </>
  );
}

interface ShareButtonProps {
  onClick?: () => void;
  href?: string;
  icon: React.ReactNode;
  label: string;
}

function ShareButton({ onClick, href, icon, label }: ShareButtonProps) {
  const className =
    'border-2 border-line hover:border-fg flex flex-col items-center gap-1 py-3 px-2 transition-colors';
  const content = (
    <>
      {icon}
      <span className="font-mono text-[10px] tracking-widest uppercase">{label}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <button onClick={onClick} type="button" className={className}>
      {content}
    </button>
  );
}
