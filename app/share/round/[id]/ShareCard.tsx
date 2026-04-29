'use client';

import { useState } from 'react';
import { Download, MessageCircle, Twitter, Copy, Check, Share2 } from 'lucide-react';

interface Props {
  sus: number;
  question: string;
  declared: string;
  imageUrl: string;
  inviteUrl: string;
}

export function ShareCard({ sus, question, declared, imageUrl, inviteUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const text = `My SUS LEVEL was ${sus}%. They thought I was ${declared.toUpperCase()}... was it cap?`;
  const fullText = `${text} ${inviteUrl}`;

  const downloadImage = async () => {
    try {
      const r = await fetch(imageUrl);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truth-or-cap-sus-${sus}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* fallback below */
      window.open(imageUrl, '_blank');
    }
  };

  const shareNative = async () => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string; files?: File[] }) => Promise<void> };
    try {
      if (typeof nav.share === 'function') {
        // Try sharing the actual PNG so TikTok/IG can pick it up directly.
        const r = await fetch(imageUrl);
        const blob = await r.blob();
        const file = new File([blob], `truth-or-cap-sus-${sus}.png`, { type: 'image/png' });
        const navAny = nav as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
        if (typeof navAny.canShare === 'function' && navAny.canShare({ files: [file] })) {
          await nav.share({ title: 'Truth or Cap', text, url: inviteUrl, files: [file] });
        } else {
          await nav.share({ title: 'Truth or Cap', text, url: inviteUrl });
        }
      } else {
        await copy();
      }
    } catch { /* user cancelled */ }
  };

  const copy = async () => {
    try {
      const nav = window.navigator;
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch { /* */ }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteUrl)}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-violet-100 pb-24">
      <div className="max-w-md mx-auto pt-8 px-5">
        <h1 className="text-2xl font-display font-black text-violet-900 text-center mb-2">Share your sus level</h1>
        <p className="text-sm text-violet-700/80 text-center mb-6">9:16 image ready for Stories, Reels and TikTok.</p>

        <div className="rounded-3xl overflow-hidden shadow-2xl bg-black aspect-[9/16] mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={`SUS LEVEL ${sus}%`} className="w-full h-full object-cover" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={downloadImage} className="rounded-2xl py-3 bg-violet-600 text-white font-bold flex items-center justify-center gap-2" type="button">
            <Download className="w-4 h-4" /> Download
          </button>
          <button onClick={shareNative} className="rounded-2xl py-3 bg-pink-500 text-white font-bold flex items-center justify-center gap-2" type="button">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-2xl py-3 bg-emerald-500 text-white font-bold flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <a href={twitter} target="_blank" rel="noopener noreferrer" className="rounded-2xl py-3 bg-sky-500 text-white font-bold flex items-center justify-center gap-2">
            <Twitter className="w-4 h-4" /> X
          </a>
          <button onClick={copy} className="rounded-2xl py-3 bg-violet-200 text-violet-900 font-bold flex items-center justify-center gap-2" type="button">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="text-xs text-violet-700/70 text-center">
          For TikTok/Instagram: download the image, then upload to your Story or post and tag <span className="font-bold">@truthorcap</span>.
        </p>

        <div className="mt-6 px-4 py-3 rounded-2xl bg-white/70 border-2 border-pink-200 text-sm text-violet-900">
          <p className="font-bold">Suggested caption</p>
          <p className="text-violet-800/90 mt-1 italic">&quot;{question}&quot;<br/>SUS LEVEL: {sus}% — they said {declared.toUpperCase()}. Was it CAP? 🎭</p>
          <button onClick={copy} className="text-xs text-violet-600 underline mt-2" type="button">{copied ? 'Caption copied' : 'Copy caption'}</button>
        </div>
      </div>
    </main>
  );
}
