import { requireUser } from '@/lib/auth/guard';
import { DemoClient } from './DemoClient';

export default async function DemoPage() {
  await requireUser('/onboarding/demo');

  return (
    <main className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 05 — DEMO
      </p>

      <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
        Try the<br />
        <span className="italic font-light">detector.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-6 max-w-sm">
        Watch a sample. Vote truth or cap. We reveal what the AI saw.
      </p>

      <DemoClient />
    </main>
  );
}
