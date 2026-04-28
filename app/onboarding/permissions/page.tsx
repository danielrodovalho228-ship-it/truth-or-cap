import { requireUser } from '@/lib/auth/guard';
import { PermissionPrompt } from '@/components/onboarding/PermissionPrompt';

export default async function PermissionsPage() {
  await requireUser('/onboarding/permissions');

  return (
    <main className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 06 — PERMISSIONS
      </p>

      <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
        Two<br />
        <span className="italic font-light">switches.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
        We never record without you tapping. We never store raw video on phones we don&apos;t own.
      </p>

      <PermissionPrompt />
    </main>
  );
}
