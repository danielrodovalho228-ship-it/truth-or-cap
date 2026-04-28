'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { validateUsername, normalizeUsername } from '@/lib/auth/utils';
import { cn } from '@/lib/utils';

interface UsernameFieldProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'error'; reason: string };

export function UsernameField({ name = 'username', value, onChange, disabled }: UsernameFieldProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const debounceRef = useRef<number | null>(null);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setStatus({ kind: 'idle' });
      return;
    }

    const validation = validateUsername(trimmed);
    if (!validation.ok) {
      setStatus({ kind: 'invalid', reason: validation.error ?? 'Invalid username' });
      return;
    }

    setStatus({ kind: 'checking' });
    const normalized = normalizeUsername(trimmed);
    lastQueryRef.current = normalized;

    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-check?username=${encodeURIComponent(normalized)}`);
        // Bail if a newer keystroke superseded this request
        if (lastQueryRef.current !== normalized) return;
        const json = await res.json();
        if (!res.ok || json.available === undefined) {
          setStatus({ kind: 'error', reason: json.reason ?? 'Could not check' });
          return;
        }
        setStatus(json.available ? { kind: 'available' } : { kind: 'taken' });
      } catch {
        if (lastQueryRef.current !== normalized) return;
        setStatus({ kind: 'error', reason: 'Network error' });
      }
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  const helper = (() => {
    switch (status.kind) {
      case 'idle':
        return { text: '3-20 chars · letters, numbers, _', tone: 'muted' as const };
      case 'invalid':
        return { text: status.reason, tone: 'error' as const };
      case 'checking':
        return { text: 'Checking…', tone: 'muted' as const };
      case 'available':
        return { text: '✓ Available', tone: 'ok' as const };
      case 'taken':
        return { text: '✗ Taken', tone: 'error' as const };
      case 'error':
        return { text: status.reason, tone: 'error' as const };
    }
  })();

  return (
    <div>
      <Label htmlFor="username">Username</Label>
      <Input
        id="username"
        name={name}
        type="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="username"
        placeholder="lucas_2026"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        invalid={status.kind === 'invalid' || status.kind === 'taken'}
        maxLength={20}
        required
      />
      <p
        className={cn(
          'mt-2 font-mono text-[10px] tracking-widest uppercase',
          helper.tone === 'muted' && 'text-fg-muted',
          helper.tone === 'ok' && 'text-acid',
          helper.tone === 'error' && 'text-blood'
        )}
        aria-live="polite"
      >
        {helper.text}
      </p>
    </div>
  );
}

export type { Status as UsernameStatus };
