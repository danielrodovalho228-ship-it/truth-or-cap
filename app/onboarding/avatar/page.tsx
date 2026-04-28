import { requireProfile } from '@/lib/auth/guard';
import { AvatarPicker } from '@/components/onboarding/AvatarPicker';

export default async function AvatarPage() {
  const { profile } = await requireProfile('/onboarding/avatar');

  return (
    <main className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 03 — AVATAR
      </p>

      <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
        Show your<br />
        <span className="italic font-light">face.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
        Friends pick you out of a list of caps based on this. Selfie works best — generated is fine
        too.
      </p>

      <AvatarPicker initialUrl={profile.avatar_url} username={profile.username} />
    </main>
  );
}
