'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ConsentDisclaimerProps {
  onAccept: () => void;
  onCancel: () => void;
}

interface CheckboxRowProps {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CheckboxRow({ checked, onToggle, children }: CheckboxRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-start gap-3 text-left"
      aria-pressed={checked}
    >
      <span
        className={cn(
          'mt-0.5 w-6 h-6 border-2 flex items-center justify-center flex-shrink-0 font-mono text-sm',
          checked ? 'bg-acid border-acid text-bg' : 'border-fg-muted text-transparent'
        )}
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="font-body text-sm leading-snug text-fg">{children}</span>
    </button>
  );
}

export function ConsentDisclaimer({ onAccept, onCancel }: ConsentDisclaimerProps) {
  const [agreed, setAgreed] = useState({
    entertainment: false,
    recording: false,
    sharing: false,
    age: false,
  });

  const allAgreed = Object.values(agreed).every(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 overflow-y-auto">
      <div className="w-full max-w-md bg-bg border-2 border-fg p-6 md:p-7 max-h-[100svh] overflow-y-auto">
        <div className="tape-stripes h-2 -mx-6 md:-mx-7 mb-5" />

        <div className="flex items-center gap-2 text-mustard mb-4">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase">Before you record</p>
        </div>

        <h2 className="font-display text-3xl font-black leading-[0.95] tracking-tight mb-4">
          Read this.<br />
          <span className="italic font-light">All four.</span>
        </h2>

        <p className="font-body text-sm text-fg-muted mb-6 leading-relaxed">
          Truth or Cap analyzes voice and face for entertainment. The SUS LEVEL is a game score —
          it has no scientific or legal validity.
        </p>

        <div className="space-y-4 mb-6">
          <CheckboxRow
            checked={agreed.entertainment}
            onToggle={() => setAgreed((s) => ({ ...s, entertainment: !s.entertainment }))}
          >
            I understand this is a <strong className="text-fg">game for entertainment</strong>, not a real lie detector.
          </CheckboxRow>

          <CheckboxRow
            checked={agreed.recording}
            onToggle={() => setAgreed((s) => ({ ...s, recording: !s.recording }))}
          >
            I consent to recording my voice and image. Recordings are stored for up to{' '}
            <strong className="text-fg">7 days</strong> then deleted.
          </CheckboxRow>

          <CheckboxRow
            checked={agreed.sharing}
            onToggle={() => setAgreed((s) => ({ ...s, sharing: !s.sharing }))}
          >
            I will <strong className="text-fg">only record people who consented</strong>. Recording someone
            without permission is illegal in many places.
          </CheckboxRow>

          <CheckboxRow
            checked={agreed.age}
            onToggle={() => setAgreed((s) => ({ ...s, age: !s.age }))}
          >
            I am at least <strong className="text-fg">13 years old</strong> (or have parental consent).
          </CheckboxRow>
        </div>

        <div className="flex gap-3">
          <Button onClick={onCancel} variant="ghost" size="md" fullWidth>
            Cancel
          </Button>
          <Button onClick={onAccept} size="md" fullWidth disabled={!allAgreed}>
            {allAgreed ? "Let's play →" : `Check all 4`}
          </Button>
        </div>

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-5 text-center">
          By continuing you agree to our{' '}
          <a href="/terms" className="text-fg underline underline-offset-2">Terms</a>
          {' '}&{' '}
          <a href="/privacy" className="text-fg underline underline-offset-2">Privacy</a>.
        </p>
      </div>
    </div>
  );
}
