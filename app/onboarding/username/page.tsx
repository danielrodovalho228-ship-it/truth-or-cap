import { requireProfile } from '@/lib/auth/guard';
import { UsernameClient } from './UsernameClient';

export default async function UsernamePage() {
  const { user, profile } = await requireProfile('/onboarding/username');

  // The DB trigger always fills username. If it generated a fallback like
  // "user_abcd1234", treat it as not-from-signup so the user re-picks.
  const fromSignup = (user.user_metadata?.username as string | undefined)?.toLowerCase() === profile.username;
  const startsWithFallback = profile.username.startsWith('user_');

  return (
    <main className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 02 — IDENTIFICATION
      </p>

      <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
        Pick a<br />
        <span className="italic font-light">handle.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
        How friends find you. Lowercase, can change later in settings.
      </p>

      <div className="space-y-5 flex-1 flex flex-col">
        <UsernameClient
          initial={startsWithFallback ? '' : profile.username}
          hadFromSignup={fromSignup && !startsWithFallback}
        />
      </div>
    </main>
  );
}
