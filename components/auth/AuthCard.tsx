import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthCardProps {
  step?: string; // e.g., "STEP 01 — IDENTIFICATION"
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ step, title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">
        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg transition-colors mb-8"
        >
          ← truthorcap
        </Link>

        {step ? (
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
            {step}
          </p>
        ) : null}

        <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-3">
          {title}
        </h1>

        {subtitle ? (
          <p className="font-body text-base text-fg-muted leading-relaxed mb-10 max-w-sm">
            {subtitle}
          </p>
        ) : (
          <div className="mb-10" />
        )}

        <div className="space-y-5">{children}</div>

        {footer ? <div className="mt-10 pt-8 border-t-2 border-line">{footer}</div> : null}
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
