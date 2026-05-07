'use client';

import Link from 'next/link';
import type { GameTheme } from '@/lib/game-types';

interface Props {
  /** Right-side caption, e.g. "Live multiplayer", "Daily challenge", "Room ABC123" */
  subtitle?: string;
  /**
   * compact = 60-72px gradient strip with the wordmark. Default.
   * hero    = full SVG/gradient banner with art + tagline.
   */
  variant?: 'compact' | 'hero';
  /**
   * Optional per-game theme. When provided, the banner re-skins itself to
   * match (gradient, emoji, eyebrow). Otherwise the brand pink → violet
   * gradient is used.
   */
  theme?: GameTheme;
  /** Optional override for the title text (defaults to "Truth or Cap"). */
  title?: string;
  /** Optional extra classes for outer wrapper. */
  className?: string;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #5b6cf6 0%, #8b5cf6 50%, #ec4899 100%)';

/**
 * Reusable brand banner for game / lobby / room pages.
 *
 * Compact: gradient strip (theme-aware) with logo tile + wordmark + subtitle.
 * Hero:    tall, illustrated header with floating dots, big emoji, eyebrow,
 *          and game title — used on the per-game record screens.
 */
export function GameBanner({
  subtitle,
  variant = 'compact',
  theme,
  title,
  className,
}: Props) {
  const gradient = theme?.gradient ?? DEFAULT_GRADIENT;
  const emoji = theme?.emoji ?? '🎙️';
  const eyebrow = theme?.eyebrow ?? 'TRUTH OR CAP';
  const heading = title ?? 'Truth or Cap';

  if (variant === 'hero') {
    return (
      <Link
        href="/"
        aria-label="Truth or Cap home"
        className={`group relative block w-full overflow-hidden rounded-2xl mb-6 shadow-sm ${className ?? ''}`}
      >
        <div
          aria-hidden="true"
          className="relative h-[140px] sm:h-[160px] w-full"
          style={{ backgroundImage: gradient }}
        >
          {/* dot texture */}
          <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="banner-dots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.3" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#banner-dots)" />
          </svg>
          {/* soft blobs */}
          <span className="absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/20 blur-2xl" />
          <span className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-black/20 blur-3xl" />

          <div className="relative h-full flex items-center px-5 sm:px-6 gap-4">
            <span
              aria-hidden="true"
              className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm text-3xl sm:text-4xl shrink-0 transition-transform group-hover:scale-105"
            >
              {emoji}
            </span>
            <div className="min-w-0 flex-1 text-white">
              <p className="font-mono text-[10px] sm:text-[11px] tracking-[0.3em] uppercase opacity-80 mb-1">
                {eyebrow}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-black leading-tight tracking-tight truncate">
                {heading}
              </h2>
              {subtitle ? (
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-80 mt-1 truncate">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // compact
  return (
    <Link
      href="/"
      aria-label="Truth or Cap home"
      className={`relative flex items-center gap-3 w-full rounded-2xl text-white px-3 mb-4 h-[64px] shadow-sm overflow-hidden hover:opacity-95 transition-opacity ${className ?? ''}`}
      style={{ backgroundImage: gradient }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full opacity-25 mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="banner-dots-compact" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#banner-dots-compact)" />
      </svg>
      <span
        aria-hidden="true"
        className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm text-xl shrink-0"
      >
        {emoji}
      </span>
      <span className="relative font-display font-black text-base sm:text-lg uppercase tracking-tight whitespace-nowrap">
        {heading}
      </span>
      {subtitle ? (
        <span className="relative ml-auto font-mono text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-white/90 truncate">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}

export default GameBanner;
