import Link from 'next/link';

interface StreakBadgeProps {
  currentStreak: number;
  level: number;
  totalXp: number;
}

/**
 * Compact streak + level chip for the top of the home screen. Links into
 * /settings where the full XP breakdown lives. Renders even at streak=0 so
 * new users see a "start your streak" prompt rather than a missing element.
 */
export function StreakBadge({ currentStreak, level, totalXp }: StreakBadgeProps) {
  const onFire = currentStreak >= 3;
  const flame = currentStreak === 0 ? 'spark' : onFire ? 'blaze' : 'lit';

  return (
    <Link
      href="/settings"
      className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-bg-card hover:border-fg p-3 mb-4 transition-colors"
      aria-label={`Streak ${currentStreak} days, level ${level}, ${totalXp} XP`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={
            'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ' +
            (onFire
              ? 'bg-gradient-to-br from-[#f59e0b] to-[#f87171] text-white shadow-sm'
              : currentStreak > 0
                ? 'bg-gradient-to-br from-[#fbbf24]/30 to-[#f87171]/30 text-fg'
                : 'bg-line/40 text-fg-muted')
          }
          aria-hidden="true"
        >
          <span className="text-lg leading-none">🔥</span>
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-black leading-tight">
            {currentStreak === 0
              ? 'Start your streak'
              : `${currentStreak}-day streak`}
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
            {flame === 'blaze' ? '1.5× XP boost · ' : ''}
            Level {level} · {totalXp.toLocaleString()} XP
          </p>
        </div>
      </div>
      <span className="font-display font-black text-xl leading-none text-fg-muted">→</span>
    </Link>
  );
}
