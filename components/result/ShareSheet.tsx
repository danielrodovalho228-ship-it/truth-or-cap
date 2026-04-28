'use client';

import { useState } from 'react';
import { Share2, MessageCircle, Twitter, Link as LinkIcon, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildShareText, whatsappLink, twitterIntent } from '@/lib/share';

interface ShareSheetProps {
  username: string;
  question: string;
  susLevel: number;
  url: string;
}

type NavigatorWithShare = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
};

export function ShareSheet({ username, question, susLevel, url }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText({ username, question, susLevel, url });

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
    <motion.section
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 3.4 }}
      className="sticky bottom-0 left-0 right-0 z-30 px-5 pt-3 pb-5 bg-bg/95 backdrop-blur-sm border-t-2 border-fg"
    >
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3 text-center">
        Send to people who will roast you
      </p>
      <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
        <ShareButton onClick={tryNative} icon={<Share2 className="w-4 h-4" />} label="Share" />
        <ShareButton href={whatsappLink(text)} icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" />
        <ShareButton href={twitterIntent(text, url)} icon={<Twitter className="w-4 h-4" />} label="X" />
        <ShareButton
          onClick={copy}
          icon={copied ? <Check className="w-4 h-4 text-acid" /> : <LinkIcon className="w-4 h-4" />}
          label={copied ? 'Copied' : 'Copy'}
        />
      </div>
    </motion.section>
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
