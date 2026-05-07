import Link from 'next/link';
import type { GameTypeMeta } from '@/lib/game-types';

interface Props {
  game: GameTypeMeta;
  href: string;
  /** Right-aligned chip text, e.g. "10 questions · 30s" */
  meta?: string;
}

/**
 * Vibrant game card used on /game/select and /jogo/select.
 *
 * Layout:
 *   [ gradient art tile w/ floating emoji + dots ] [ eyebrow + title + tagline + meta ]
 *
 * The gradient comes from `game.theme.gradient`. We layer a low-opacity
 * SVG dot pattern on top so each card has texture even with CSS-only art.
 */
export function GameCard({ game, href, meta }: Props) {
  const { theme } = game;
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border-2 border-line bg-bg-card hover:border-fg transition-colors shadow-sm hover:shadow-md"
    >
      <div className="flex items-stretch gap-0">
        {/* Art tile */}
        <div
          aria-hidden="true"
          className="relative w-24 sm:w-28 shrink-0 overflow-hidden"
          style={{ backgroundImage: theme.gradient }}
        >
          {/* dot pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id={`dots-${game.id}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#dots-${game.id})`} />
          </svg>
          {/* soft blob */}
          <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/20 blur-xl" />
          <span className="absolute -bottom-8 -left-6 w-24 h-24 rounded-full bg-black/20 blur-2xl" />
          {/* emoji */}
          <span
            className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl drop-shadow-md transition-transform group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
          >
            {theme.emoji}
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-1.5">
            {theme.eyebrow}
          </p>
          <p className="font-display text-xl sm:text-2xl font-black leading-tight mb-1 truncate">
            {game.label}
          </p>
          <p className="font-body text-sm text-fg-muted leading-snug line-clamp-2 mb-2">
            {game.tagline}
          </p>
          {meta ? (
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default GameCard;
