'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { SkipButton } from './SkipButton';

const STEPS: ReadonlyArray<{ path: string; label: string }> = [
  { path: '/onboarding', label: 'WELCOME' },
  { path: '/onboarding/username', label: 'IDENTIFICATION' },
  { path: '/onboarding/avatar', label: 'AVATAR' },
  { path: '/onboarding/voice', label: 'CALIBRATION' },
  { path: '/onboarding/demo', label: 'DEMO' },
  { path: '/onboarding/permissions', label: 'PERMISSIONS' },
  { path: '/onboarding/friends', label: 'NETWORK' },
  { path: '/onboarding/done', label: 'READY' },
];

const SKIP_ROUTES = new Map<string, string>([
  ['/onboarding/avatar', '/onboarding/voice'],
  ['/onboarding/voice', '/onboarding/demo'],
  ['/onboarding/demo', '/onboarding/permissions'],
  ['/onboarding/friends', '/onboarding/done'],
]);

export function OnboardingShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.path === path));
  const skipTo = SKIP_ROUTES.get(path);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="tape-stripes h-2" />

      <header className="px-5 pt-4 pb-3 max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
            {String(stepIndex + 1).padStart(2, '0')} / {STEPS.length}
          </span>
          {skipTo ? <SkipButton href={skipTo} /> : <span aria-hidden="true" className="w-12" />}
        </div>
        <ProgressBar current={stepIndex + 1} total={STEPS.length} />
      </header>

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
