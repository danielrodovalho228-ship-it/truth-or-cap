import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top truthers and cap-callers on Truth or Cap. See who outranks the rest.',
};

interface LeaderboardRow {
  id: string;
  username: string;
  avatar_url: string | null;
  current_streak: number;
  total_invites_redeemed: number;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Public top 50 — anyone can see this. Order by current_streak desc as a
  // best-effort "truther" ranking using only public profile columns.
  const { data: topRows } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak, total_invites_redeemed')
    .eq('is_public', true)
    .order('current_streak', { ascending: false })
    .order('total_invites_redeemed', { ascending: false })
    .limit(50);

  const top: LeaderboardRow[] = topRows ?? [];

  // Optional: if a user is signed in, highlight their position.
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id ?? null;
  const myRankIndex = currentUserId
    ? top.findIndex((r) => r.id === currentUserId)
    : -1;

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
          Top 50 truthers
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          Who calls<br />
          <span className="italic font-light">your bluff?</span>
        </h1>

        {top.length > 0 ? (
          <ol className="space-y-2">
            {top.map((row, i) => {
              const isMe = currentUserId === row.id;
              return (
                <li
                  key={row.id}
                  className={
                    'border-2 p-3 flex items-center gap-3 ' +
                    (isMe ? 'border-mustard bg-mustard/10' : 'border-line')
                  }
                >
                  <span className="font-display text-2xl font-black w-8 text-mustard">
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
                      streak {row.current_streak} ·{' '}
                      {row.total_invites_redeemed} invites redeemed
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            No rankings yet — be the first.
          </p>
        )}

        {!currentUserId ? (
          <div className="mt-10 border-2 border-line p-5 text-center">
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
              Not on the board?
            </p>
            <p className="font-display text-2xl font-black leading-tight mb-4">
              Sign in to claim<br />
              <span className="italic font-light">your rank.</span>
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg">Create account</Button>
            </Link>
            <p className="mt-3 font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              Have one already?{' '}
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-4 hover:text-fg"
              >
                Sign in
              </Link>
            </p>
          </div>
        ) : myRankIndex === -1 ? (
          <div className="mt-10 border-2 border-line p-5 text-center">
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              You haven&apos;t cracked the top 50 yet. Keep playing.
            </p>
          </div>
        ) : null}
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
