'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { requestPasswordReset, type ActionResult } from '@/lib/auth/actions';

const initial: ActionResult = { ok: false };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initial);

  if (state.ok && state.message) {
    return (
      <div role="status" className="border-2 border-acid p-5">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-acid mb-2">
          Check your inbox
        </p>
        <p className="font-body text-sm text-fg-muted leading-relaxed">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="email-fp">Email</Label>
        <Input
          id="email-fp"
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
      {state.error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" size="lg" fullWidth disabled={pending}>
        {pending ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  );
}
