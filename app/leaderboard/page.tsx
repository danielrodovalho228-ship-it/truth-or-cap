import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Leaderboard · Truth or Cap',
  robots: { index: false },
};

const UNLOCK_THRESHOLD = 5;

export default async function LeaderboardPage() {
  const user = await requireUser('/leaderboard');
  const supabase = await createClient();

  const { count: friendCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const friends = friendCount ?? 0;

  if (friends < UNLOCK_THRESHOLD) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="tape-stripes h-3 w-full" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full text-center">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
            Locked
          </p>
          <h1 className="font-display text-5xl font-black leading-[0.9] mb-4">
            Add {UNLOCK_THRESHOLD - friends} more<br />
            <span className="italic font-light">to unlock.</span>
          </h1>
          <p className="font-body text-sm text-fg-muted mb-8 leading-relaxed max-w-sm">
            Leaderboard ranks you against friends. Without friends, no ranking. Add {UNLOCK_THRESHOLD} friends to see your tier in the global pool.
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-6">
            {friends}/{UNLOCK_THRESHOLD} friends added
          </p>
          <Link href="/onboarding/friends">
            <Button size="lg">Find friends</Button>
          </Link>
        </div>
        <div className="tape-stripes h-3 w-full" />
      </main>
    );
  }

  const { data: stats } = await supabase
    .from('friend_stats')
    .select('friend_id, detection_accuracy, games_against, last_played_at')
    .eq('user_id', user.id)
    .order('detection_accuracy', { ascending: false })
    .limit(20);

  const ids = (stats ?? []).map((s) => s.friend_id);
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username').in('id', ids)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← Home
        </Link>
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Detector ranking</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          Who calls<br />
          <span className="italic font-light">your bluff?</span>
        </h1>

        {(stats?.length ?? 0) > 0 ? (
          <ol className="space-y-2">
            {stats!.map((s, i) => (
              <li key={s.friend_id} className="border-2 border-line p-3 flex items-center gap-3">
                <span className="font-display text-2xl font-black w-8 text-mustard">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg truncate">
                    @{profileMap.get(s.friend_id) ?? '???'}
                  </p>
                  <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
                    {Math.round((s.detection_accuracy ?? 0) * 100)}% detection · {s.games_against} games
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            No games yet to rank against.
          </p>
        )}
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
