'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Copy, Check, X, Loader2 } from 'lucide-react';
import { renderShareCard, shareCardFilename } from '@/lib/shareCard';
import { buildShareText } from '@/lib/share';
import type { Lang } from '@/lib/i18n/messages';

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  question: string;
  susLevel: number;
  declaredAnswer: 'truth' | 'cap';
  url: string;
  lang: Lang;
}

type NavigatorWithShare = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string; files?: File[] }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
};

const COPY = {
  en: {
    title: 'Your verdict card',
    sub: 'Save it, post it, dare them.',
    share: 'Share',
    download: 'Download',
    copy: 'Copy text',
    copied: 'Copied',
    rendering: 'Rendering card…',
    failed: 'Card unavailable. Try Share or Copy instead.',
    close: 'Close',
  },
  pt: {
    title: 'Seu card do veredito',
    sub: 'Salva, posta, desafia.',
    share: 'Compartilhar',
    download: 'Baixar',
    copy: 'Copiar texto',
    copied: 'Copiado',
    rendering: 'Renderizando…',
    failed: 'Card indisponível. Use Compartilhar ou Copiar.',
    close: 'Fechar',
  },
} as const;

export function ShareCardModal({
  open,
  onClose,
  username,
  question,
  susLevel,
  declaredAnswer,
  url,
  lang,
}: ShareCardModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const renderingForKey = useRef<string | null>(null);
  const t = COPY[lang];
  const filename = shareCardFilename(username);
  const shareText = buildShareText({ username, question, susLevel, url });

  // Render the card on open. Re-render if inputs change between opens.
  useEffect(() => {
    if (!open) return;
    const key = `${username}|${susLevel}|${question}|${declaredAnswer}|${lang}`;
    if (renderingForKey.current === key && (dataUrl || renderFailed)) return;
    renderingForKey.current = key;
    setDataUrl(null);
    setBlob(null);
    setRenderFailed(false);

    let cancelled = false;
    void (async () => {
      try {
        const result = await renderShareCard({
          username,
          question,
          susLevel,
          declaredAnswer,
          lang,
        });
        if (cancelled) return;
        if (!result) {
          setRenderFailed(true);
          return;
        }
        setDataUrl(result.dataUrl);
        setBlob(result.blob);
      } catch (err) {
        console.error('[shareCard] render failed:', err);
        if (!cancelled) setRenderFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, username, susLevel, question, declaredAnswer, lang, dataUrl, renderFailed]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator as NavigatorWithShare;
    const file = blob ? new File([blob], filename, { type: 'image/png' }) : null;
    if (file && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
      try {
        await nav.share({ title: 'Truth or Cap', text: shareText, url, files: [file] });
        return;
      } catch {
        /* user cancelled */
        return;
      }
    }
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: 'Truth or Cap', text: shareText, url });
        return;
      } catch {
        return;
      }
    }
    handleDownload();
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = async () => {
    try {
      if (typeof window === 'undefined') return;
      await window.navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="bg-bg-card border-2 border-fg w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-fg">
              <div>
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
                  {t.title}
                </p>
                <p className="font-display text-lg leading-tight">{t.sub}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="w-9 h-9 border-2 border-line hover:border-fg flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="aspect-[4/5] w-full bg-[#0a0e1a] flex items-center justify-center overflow-hidden mb-5 border-2 border-line">
                {dataUrl ? (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    src={dataUrl}
                    alt="Verdict share card"
                    className="w-full h-full object-contain"
                  />
                ) : renderFailed ? (
                  <p className="font-mono text-[11px] tracking-widest uppercase text-blood text-center px-6">
                    {t.failed}
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-fg-muted">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="font-mono text-[10px] tracking-widest uppercase">{t.rendering}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!dataUrl && !renderFailed}
                  className="border-2 border-fg bg-fg text-bg disabled:opacity-50 disabled:cursor-not-allowed py-3 flex flex-col items-center gap-1 hover:bg-bg hover:text-fg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="font-mono text-[10px] tracking-widest uppercase">
                    {t.share}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!dataUrl}
                  className="border-2 border-line hover:border-fg disabled:opacity-50 disabled:cursor-not-allowed py-3 flex flex-col items-center gap-1 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="font-mono text-[10px] tracking-widest uppercase">
                    {t.download}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="border-2 border-line hover:border-fg py-3 flex flex-col items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-acid" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="font-mono text-[10px] tracking-widest uppercase">
                    {copied ? t.copied : t.copy}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
