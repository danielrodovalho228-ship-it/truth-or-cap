'use client';

import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';

interface OpenInBrowserBannerProps {
  inAppBrowser: 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'linkedin';
  externalUrl: string;
}

const LABEL: Record<OpenInBrowserBannerProps['inAppBrowser'], string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
};

export function OpenInBrowserBanner({ inAppBrowser, externalUrl }: OpenInBrowserBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-mustard text-bg px-4 py-3 flex items-start gap-3">
      <ExternalLink className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-mono text-[10px] tracking-widest uppercase mb-1">
          You&apos;re in {LABEL[inAppBrowser]}&apos;s browser
        </p>
        <p className="font-display text-sm leading-snug mb-2">
          Recording + AI voting need a real browser. Open in Safari/Chrome to play.
        </p>
        <a
          href={externalUrl}
          className="inline-block border-2 border-bg bg-bg text-mustard px-3 py-2 font-mono text-xs tracking-widest uppercase"
        >
          Open in browser
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
