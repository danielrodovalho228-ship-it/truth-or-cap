import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { requireProfile } from '@/lib/auth/guard';

export default async function DonePage() {
  const { profile } = await requireProfile('/onboarding/done');

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-md mx-auto w-full text-center">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-acid mb-4">
        STEP 08 — READY
      </p>

      <h1 className="font-display text-7xl md:text-8xl font-black leading-[0.85] tracking-tight mb-4">
        @{profile.username}.<br />
        <span className="italic font-light">You&apos;re in.</span>
      </h1>

      <div className="tape-stripes h-1 w-32 my-6" />

      <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-xs">
        Pick a question, hit record, send to friends. The AI has 30 seconds to call your bluff.
      </p>

      <Link href="/jogo/novo" className="w-full max-w-xs">
        <Button size="xl" fullWidth>
          Record first game →
        </Button>
      </Link>

      <Link
        href="/"
        className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg mt-4"
      >
        Or peek the home page
      </Link>
    </main>
  );
}
