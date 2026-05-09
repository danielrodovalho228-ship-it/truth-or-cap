import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { LeaderboardRowItem } from '@/components/layout/LeaderboardRow';
import { getFriendsLeaderboard, type LeaderboardPeriod } from '@/lib/xp';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top truthers and cap-callers on Truth or Cap. See who outranks the rest.',
};

interface PublicRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
}

type Scope = 'friends' | 'public';

interface PageProps {
  searchParams?: Promise<{ scope?: string; period?: string }>;
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const scope: Scope = sp.scope === 'public' ? 'public' : 'friends';
  const period: LeaderboardPeriod = sp.period === 'all_time' ? 'all_time' : 'weekly';

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id ?? null;

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block"
        >
          Home
        </Link>
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Leaderboard
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          Who calls<br />
          <span className="italic font-light">your bluff?</span>
        </h1>

        {/* Scope tabs (Friends / Public) — Friends needs auth. */}
        <div className="grid grid-cols-2 gap-2 mb-3 p-1 border-2 border-line rounded-xl bg-bg-card">
          <ScopeTab scope="friends" current={scope} period={period}>
            Friends
          </ScopeTab>
          <ScopeTab scope="public" current={scope} period={period}>
            Public
          </ScopeTab>
        </div>

        {scope === 'friends' ? (
          <FriendsLeaderboard
            period={period}
            signedIn={Boolean(currentUserId)}
          />
        ) : (
          <PublicLeaderboard currentUserId={currentUserId} />
        )}
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

function ScopeTab({
  scope,
  current,
  period,
  children,
}: {
  scope: Scope;
  current: Scope;
  period: LeaderboardPeriod;
  children: React.ReactNode;
}) {
  const active = scope === current;
  const href = `/leaderboard?scope=${scope}${scope === 'friends' ? `&period=${period}` : ''}`;
  return (
    <Link
      href={href}
      className={
        'text-center py-2 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-colors ' +
        (active
          ? 'bg-fg text-bg font-black'
          : 'text-fg-muted hover:text-fg')
      }
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

function PeriodTab({
  period,
  current,
}: {
  period: LeaderboardPeriod;
  current: LeaderboardPeriod;
}) {
  const active = period === current;
  return (
    <Link
      href={`/leaderboard?scope=friends&period=${period}`}
      className={
        'text-center py-2 px-3 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-colors ' +
        (active
          ? 'bg-mustard text-bg font-black'
          : 'text-fg-muted hover:text-fg')
      }
      aria-current={active ? 'page' : undefined}
    >
      {period === 'weekly' ? 'This week' : 'All time'}
    </Link>
  );
}

async function FriendsLeaderboard({
  period,
  signedIn,
}: {
  period: LeaderboardPeriod;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <div className="border-2 border-line rounded-2xl p-6 text-center mt-4">
        <p className="font-display text-2xl font-black leading-tight mb-2">
          Sign in to see<br />
          <span className="italic font-light">your circle.</span>
        </p>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-4">
          Friends-only ranking — XP, streaks, levels.
        </p>
        <Link href="/auth/sign-up">
          <Button size="md" fullWidth>Create account</Button>
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const rows = await getFriendsLeaderboard(supabase, period);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4 p-1 border-2 border-line rounded-xl bg-bg-card">
        <PeriodTab period="weekly" current={period} />
        <PeriodTab period="all_time" current={period} />
      </div>

      {rows.length > 1 ? (
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.user_id}>
              <LeaderboardRowItem
                rank={i + 1}
                username={row.username}
                avatarUrl={row.avatar_url}
                level={row.current_level}
                currentStreak={row.current_streak}
                scoreLabel={period === 'weekly' ? 'XP this week' : 'XP all time'}
                scoreValue={(period === 'weekly' ? row.weekly_xp : row.total_xp).toLocaleString()}
                isSelf={row.is_self}
                href={row.is_self ? '/settings' : `/perfil/${row.username}`}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-2 border-line rounded-2xl p-6 text-center">
          <Image
            src="/illustrations/leaderboard-empty.svg"
            alt=""
            width={200}
            height={160}
            className="mx-auto mb-3"
            unoptimized
          />
          <p className="font-display text-2xl font-black leading-tight mb-2">
            No circle yet.
          </p>
          <p className="font-body text-sm text-fg-muted mb-4 leading-snug">
            Add friends to start a private XP race. Streaks, levels, weekly winners.
          </p>
          <Link href="/friends/find">
            <Button size="md" fullWidth>Find friends</Button>
          </Link>
        </div>
      )}
    </>
  );
}

async function PublicLeaderboard({
  currentUserId,
}: {
  currentUserId: string | null;
}) {
  const supabase = await createClient();
  // Pulls the top profiles ranked by total_xp (then streak, then username)
  // via SECURITY DEFINER so this works for anon visitors. Falls back to an
  // empty list if the RPC isn't deployed yet.
  const { data: topRows } = await supabase.rpc('get_public_leaderboard', {
    p_limit: 50,
  });
  const top: PublicRow[] = (topRows as PublicRow[] | null) ?? [];

  if (top.length === 0) {
    return (
      <div className="text-center py-8 mt-4">
        <Image
          src="/illustrations/leaderboard-empty.svg"
          alt=""
          width={240}
          height={200}
          className="mx-auto mb-4"
          unoptimized
        />
        <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
          No rankings yet — be the first.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-2 mt-4">
      {top.map((row, i) => {
        const isMe = currentUserId === row.user_id;
        return (
          <li
            key={row.user_id}
            className={
              'border-2 rounded-xl p-3 flex items-center gap-3 ' +
              (isMe ? 'border-mustard bg-mustard/10' : 'border-line bg-bg-card')
            }
          >
            <span className="font-display text-2xl font-black w-8 text-center text-mustard">
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg truncate">
                @{row.username}
                {isMe ? (
                  <span className="ml-2 font-mono text-[10px] tracking-widest uppercase text-mustard">
                    you
                  </span>
                ) : null}
              </p>
              <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
                Lv {row.current_level} · {row.total_xp.toLocaleString()} XP{' '}
                <span className="opacity-60">
                  · <span aria-hidden="true">🔥</span> {row.current_streak}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
