import Image from 'next/image';
import Link from 'next/link';
import { generatedAvatarUrl } from '@/lib/avatar';

interface LeaderboardRowProps {
  rank: number;
  username: string;
  avatarUrl: string | null;
  level: number;
  currentStreak: number;
  scoreLabel: string;
  scoreValue: string;
  isSelf: boolean;
  href?: string;
}

export function LeaderboardRowItem({
  rank,
  username,
  avatarUrl,
  level,
  currentStreak,
  scoreLabel,
  scoreValue,
  isSelf,
  href,
}: LeaderboardRowProps) {
  const onFire = currentStreak >= 3;
  const inner = (
    <div
      className={
        'flex items-center gap-3 border-2 rounded-xl p-3 transition-colors ' +
        (isSelf
          ? 'border-mustard bg-mustard/10'
          : 'border-line hover:border-fg bg-bg-card')
      }
    >
      <span
        className={
          'font-display text-2xl font-black w-8 text-center shrink-0 ' +
          (rank <= 3 ? 'text-mustard' : 'text-fg-muted')
        }
      >
        #{rank}
      </span>
      <div className="w-10 h-10 rounded-xl border-2 border-line overflow-hidden flex-shrink-0">
        <Image
          src={avatarUrl ?? generatedAvatarUrl(username)}
          alt=""
          width={40}
          height={40}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-base font-black truncate">
          @{username}
          {isSelf ? (
            <span className="ml-2 font-mono text-[10px] tracking-widest uppercase text-mustard">
              you
            </span>
          ) : null}
        </p>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          Lv {level}
          {currentStreak > 0 ? (
            <>
              {' · '}
              <span aria-hidden="true">🔥</span> {currentStreak}
              {onFire ? (
                <span className="ml-1 text-mustard">1.5×</span>
              ) : null}
            </>
          ) : null}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg font-black leading-tight">{scoreValue}</p>
        <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
          {scoreLabel}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
