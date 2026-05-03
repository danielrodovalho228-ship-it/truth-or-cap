'use client';

import { useActionState, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  signInWithPassword,
  signUpWithPassword,
  type ActionResult,
} from '@/lib/auth/actions';
import { UsernameField } from './UsernameField';

interface PasswordFormProps {
  mode: 'sign-in' | 'sign-up';
}

const initial: ActionResult = { ok: false };

export function PasswordForm({ mode }: PasswordFormProps) {
  const [username, setUsername] = useState('');
  const action = mode === 'sign-up' ? signUpWithPassword : signInWithPassword;
  const [state, formAction, pending] = useActionState(action, initial);

  if (state.ok && state.message) {
    return (
      <div role="status" className="border-2 border-acid p-5">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-acid mb-2">
          ✓ Account created
        </p>
        <p className="font-body text-sm text-fg-muted leading-relaxed">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="email-pw">Email</Label>
        <Input
          id="email-pw"
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

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          minLength={8}
          required
          disabled={pending}
        />
      </div>

      {state.error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood" role="alert">
          {state.error}
        </p>
      ) : null}

      {mode === 'sign-in' ? (
        <p className="text-right">
          <a href="/auth/forgot-password" className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg underline underline-offset-4">
            Forgot password?
          </a>
        </p>
      ) : null}

      <Button type="submit" variant="secondary" size="lg" fullWidth disabled={pending}>
        {pending ? 'Working…' : mode === 'sign-up' ? 'Create with password' : 'Sign in with password'}
      </Button>
    </form>
  );
}
