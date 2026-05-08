import { levelProgress } from '@/lib/xp';

interface XpBarProps {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
}

export function XpBar({ totalXp, currentStreak, longestStreak }: XpBarProps) {
  const p = levelProgress(totalXp);
  const pct = Math.round(p.percent * 100);
  const onFire = currentStreak >= 3;

  return (
    <div className="border-2 border-line rounded-2xl p-4 mb-6 bg-gradient-to-br from-pink-500/5 to-violet-600/5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard">
          Level {p.level}
        </p>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          {totalXp.toLocaleString()} XP
        </p>
      </div>

      <div className="relative h-3 rounded-full bg-line/50 overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5b6cf6] to-[#ec4899]"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-3">
        {p.toNext > 0
          ? `${p.toNext.toLocaleString()} XP to level ${p.level + 1}`
          : 'Max level reached'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="border-2 border-line rounded-xl p-2 bg-bg-card">
          <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
            Streak
          </p>
          <p className="font-display text-xl font-black leading-tight">
            <span className="mr-1" aria-hidden="true">🔥</span>
            {currentStreak}
            {onFire ? (
              <span className="ml-2 font-mono text-[9px] tracking-widest uppercase text-mustard align-middle">
                1.5×
              </span>
            ) : null}
          </p>
        </div>
        <div className="border-2 border-line rounded-xl p-2 bg-bg-card">
          <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
            Best
          </p>
          <p className="font-display text-xl font-black leading-tight">
            {longestStreak}
            <span className="ml-1 font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              days
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
