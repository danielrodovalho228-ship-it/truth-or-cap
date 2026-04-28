import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="tape-stripes h-3 w-full absolute top-0" />
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">404</p>
      <h1 className="font-display text-5xl font-black leading-[0.9] mb-4">
        Evidence<br />
        <span className="italic font-light">missing.</span>
      </h1>
      <p className="font-body text-sm text-fg-muted leading-relaxed max-w-sm mb-6">
        This case was either deleted, expired, or never existed.
      </p>
      <Link href="/"><Button size="lg">Back to home</Button></Link>
      <div className="tape-stripes h-3 w-full absolute bottom-0" />
    </main>
  );
}
