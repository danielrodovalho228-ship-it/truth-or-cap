import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { requireUser } from '@/lib/auth/guard';

export default async function WelcomePage() {
  await requireUser('/onboarding');

  return (
    <main className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 01 — WELCOME
      </p>

      <h1 className="font-display text-6xl md:text-7xl font-black leading-[0.9] tracking-tight mb-5">
        Spot the cap.<br />
        <span className="italic font-light">Become the cap.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-8">
        90 seconds to calibrate. Then record your first answer and send it to friends. They vote, the
        AI ranks, and we crown whoever lies best.
      </p>

      <div className="border-2 border-line p-4 mb-3">
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
          What you&apos;ll do
        </p>
        <ul className="space-y-2 font-display text-base">
          <li className="flex gap-3"><span className="text-mustard font-mono text-xs">01</span> Pick a handle + photo</li>
          <li className="flex gap-3"><span className="text-mustard font-mono text-xs">02</span> Train the AI on your normal voice</li>
          <li className="flex gap-3"><span className="text-mustard font-mono text-xs">03</span> Try the detector on a sample</li>
          <li className="flex gap-3"><span className="text-mustard font-mono text-xs">04</span> Connect your circle</li>
        </ul>
      </div>

      <Link href="/onboarding/username" className="mt-auto pt-6">
        <Button size="xl" fullWidth>
          Begin →
        </Button>
      </Link>

      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-4">
        Free forever · Skip most steps · No password
      </p>
    </main>
  );
}
