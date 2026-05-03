'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { updatePassword, type ActionResult } from '@/lib/auth/actions';

const initial: ActionResult = { ok: false };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="password-new">New password</Label>
        <Input
          id="password-new"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="********"
          minLength={8}
          required
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="password-confirm">Confirm</Label>
        <Input
          id="password-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="********"
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
      <Button type="submit" variant="secondary" size="lg" fullWidth disabled={pending}>
        {pending ? 'Saving...' : 'Update password'}
      </Button>
    </form>
  );
}
