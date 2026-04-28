import { requireUser } from '@/lib/auth/guard';
import { FriendsClient } from './FriendsClient';

export default async function FriendsPage() {
  await requireUser('/onboarding/friends');

  return (
    <main className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 07 — NETWORK
      </p>

      <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
        Bring<br />
        <span className="italic font-light">your circle.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
        The game is more fun when your real friends try to spot your cap.
      </p>

      <FriendsClient />
    </main>
  );
}
