'use client';

import { useActionState, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  signInWithMagicLink,
  signUpWithMagicLink,
  type ActionResult,
} from '@/lib/auth/actions';
import { UsernameField } from './UsernameField';

interface MagicLinkFormProps {
  mode: 'sign-in' | 'sign-up';
  next?: string;
}

const initial: ActionResult = { ok: false };

export function MagicLinkForm({ mode, next = '/' }: MagicLinkFormProps) {
  const [username, setUsername] = useState('');
  const action = mode === 'sign-up' ? signUpWithMagicLink : signInWithMagicLink;
  const [state, formAction, pending] = useActionState(action, initial);

  if (state.ok && state.message) {
    return (
      <div
        role="status"
        className="border-2 border-acid p-5 text-fg"
      >
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-acid mb-2">
          ✓ Link sent
        </p>
        <p className="font-display text-2xl leading-tight mb-3">
          Check your inbox.
        </p>
        <p className="font-body text-sm text-fg-muted leading-relaxed">
          {state.message} If you don&apos;t see it, check spam. We use a different sender than most apps.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@example.com"
          required
          disabled={pending}
        />
      </div>

      {mode === 'sign-up' ? (
        <UsernameField value={username} onChange={setUsername} disabled={pending} />
      ) : null}

      {state.error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? 'Sending…' : mode === 'sign-up' ? 'Create account · Magic link' : 'Sign in · Magic link'}
      </Button>

      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center">
        No password. Click the link in your inbox.
      </p>
    </form>
  );
}
