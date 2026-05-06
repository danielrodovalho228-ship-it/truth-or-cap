'use client';

import Link from 'next/link';

interface Props {
  /** Right-side caption, e.g. "Live multiplayer", "Daily challenge", "Room ABC123" */
  subtitle?: string;
  /** hero = full SVG banner background; compact = inline gradient strip */
  variant?: 'compact' | 'hero';
  /** Optional extra classes for outer wrapper. */
  className?: string;
}

/**
 * Reusable brand banner for game / lobby / room pages.
 *
 * Two variants:
 *  - compact (default): 60px gradient pink->violet strip with logo "T" tile,
 *    "TRUTH OR CAP" wordmark and right-aligned subtitle.
 *  - hero: uses /illustrations/game-banner.svg as a tall background image
 *    (1200x200) with the subtitle overlaid bottom-right.
 *
 * Whole banner is a Link to "/".
 */
export function GameBanner({ subtitle, variant = 'compact', className }: Props) {
  if (variant === 'hero') {
    return (
      <Link
        href="/"
        aria-label="Truth or Cap home"
        className={`relative block w-full overflow-hidden rounded-2xl mb-6 ${className ?? ''}`}
      >
        {/* SVG hero banner — small file, inline <img> is plenty */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/game-banner.svg"
          alt="Truth or Cap"
          className="block w-full h-auto"
          width={1200}
          height={200}
        />
        {subtitle ? (
          <span className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] tracking-[0.3em] uppercase text-white/90 bg-black/30 px-2 py-1 rounded">
            {subtitle}
          </span>
        ) : null}
      </Link>
    );
  }

  // compact
  return (
    <Link
      href="/"
      aria-label="Truth or Cap home"
      className={`flex items-center gap-3 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 text-white px-3 mb-4 h-[60px] shadow-sm hover:opacity-95 transition-opacity ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white text-violet-700 font-display font-black text-xl leading-none shrink-0"
      >
        T
      </span>
      <span className="font-display font-black text-base sm:text-lg uppercase tracking-tight whitespace-nowrap">
        Truth or Cap
      </span>
      {subtitle ? (
        <span className="ml-auto font-mono text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-white/90 truncate">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}

export default GameBanner;
