import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guard';
import { FriendsClient } from '@/app/onboarding/friends/FriendsClient';

export const metadata: Metadata = {
  title: 'Find friends · Truth or Cap',
  robots: { index: false },
};

export default async function FindFriendsPage() {
  await requireUser('/friends/find');

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        <Link
          href="/friends"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block"
        >
          ← Friends
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Network
        </p>

        <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
          Find<br />
          <span className="italic font-light">your circle.</span>
        </h1>

        <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
          Match phone numbers to find friends already on Truth or Cap. Numbers stay on your device.
        </p>

        <FriendsClient />
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
