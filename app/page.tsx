import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (user) {
    redirect('/home');
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top tape */}
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        {/* Label */}
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-6">
          — A game by truthorcap —
        </p>

        {/* Big serif headline */}
        <h1 className="font-display text-7xl md:text-8xl font-black leading-[0.85] tracking-tight text-center mb-2">
          Truth
          <br />
          <span className="italic font-light">or</span>
          <br />
          Cap.
        </h1>

        {/* Tape divider */}
        <div className="tape-stripes h-1 w-32 my-8" />

        {/* Subtitle */}
        <p className="font-display text-xl md:text-2xl text-center leading-snug max-w-sm mb-2">
          Spot the cap.
          <br />
          <span className="italic text-fg-muted">Become the cap.</span>
        </p>

        <p className="font-body text-base text-fg-muted text-center max-w-xs mb-12 leading-relaxed">
          AI-powered voice + video lie detector. Record. Send. Watch friends fail.
        </p>

        {/* CTA */}
        {user ? (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Link
              href="/game/select"
              className="border-2 border-fg bg-fg text-bg px-8 py-4 font-display text-2xl font-black uppercase tracking-tight hover:bg-bg hover:text-fg transition-colors text-center"
            >
              + New game
            </Link>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Link href="/home" className="border-2 border-line hover:border-fg py-2 text-center font-mono text-[10px] tracking-widest uppercase">Feed</Link>
              <Link href="/friends" className="border-2 border-line hover:border-fg py-2 text-center font-mono text-[10px] tracking-widest uppercase">Friends</Link>
              <Link href="/leaderboard" className="border-2 border-line hover:border-fg py-2 text-center font-mono text-[10px] tracking-widest uppercase">Rank</Link>
            </div>
            <Link
              href="/settings"
              className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg text-center mt-2"
            >
              Settings
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link
              href="/auth/sign-up"
              className="border-2 border-fg bg-fg text-bg px-8 py-4 font-display text-2xl font-black uppercase tracking-tight hover:bg-bg hover:text-fg transition-colors group inline-flex items-center justify-center gap-3"
            >
              Start playing
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/auth/sign-in"
              className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg text-center"
            >
              Have an account? Sign in
            </Link>
          </div>
        )}

        {/* Footer note */}
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-12">
          Coming soon · 90 sec setup · Free forever
        </p>
      </div>

      {/* Bottom tape */}
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
