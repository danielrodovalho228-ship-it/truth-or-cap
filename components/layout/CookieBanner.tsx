'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

/** Minimal LGPD/GDPR-friendly notice. We don't use ad-tracking cookies, only
 *  essential session + vote cookies, so we just inform the user once and
 *  remember the dismissal in localStorage.
 */
export function CookieBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const acked = window.localStorage.getItem('cookie_ack_v1');
    if (!acked) setHidden(false);
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem('cookie_ack_v1', String(Date.now()));
    } catch {
      /* ignore quota errors */
    }
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg border-t-2 border-mustard px-4 py-3 md:bottom-20">
      <div className="max-w-md mx-auto flex items-start gap-3">
        <div className="flex-1">
          <p className="font-mono text-[10px] tracking-widest uppercase text-mustard mb-1">
            Cookies
          </p>
          <p className="font-body text-xs leading-snug text-fg">
            We only use essential cookies (auth, vote tracking). No ad-tracking, ever.
            See <Link href="/cookies" className="underline">policy</Link>.
          </p>
        </div>
        <button
          onClick={accept}
          className="border-2 border-fg bg-fg text-bg px-3 py-1 font-mono text-[10px] tracking-widest uppercase hover:bg-bg hover:text-fg transition-colors flex-shrink-0"
        >
          OK
        </button>
        <button
          onClick={accept}
          aria-label="Dismiss"
          className="flex-shrink-0 text-fg-muted hover:text-fg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
