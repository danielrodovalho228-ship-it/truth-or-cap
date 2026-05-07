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
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg transition-colors mb-6"
        >
          ← truthorcap
        </Link>

        {/* Hero gradient banner — replaces flat top with a colorful accent */}
        <div
          aria-hidden="true"
          className="relative overflow-hidden rounded-2xl mb-7 shadow-sm"
          style={{
            backgroundImage: 'linear-gradient(135deg, #5b6cf6 0%, #8b5cf6 50%, #ec4899 100%)',
          }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="auth-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-dots)" />
          </svg>
          <span className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
          <span className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-black/20 blur-3xl" />
          <div className="relative flex items-center gap-3 p-4 text-white">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm text-2xl shrink-0">
              🎙️
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-80">
                Truth or Cap
              </p>
              <p className="font-display text-lg font-black leading-tight">
                Spot the cap. Become the cap.
              </p>
            </div>
          </div>
        </div>

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
