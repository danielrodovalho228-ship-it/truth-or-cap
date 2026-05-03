'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { UsernameField } from '@/components/auth/UsernameField';
import { createClient } from '@/lib/supabase/client';
import { validateUsername, normalizeUsername } from '@/lib/auth/utils';

interface UsernameClientProps {
  initial: string;
  hadFromSignup: boolean;
}

export function UsernameClient({ initial, hadFromSignup }: UsernameClientProps) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    const validation = validateUsername(value);
    if (!validation.ok) {
      setError(validation.error ?? 'Invalid username');
      return;
    }

    startTransition(async () => {
      // If unchanged from signup, skip the write.
      if (normalizeUsername(value) === normalizeUsername(initial) && hadFromSignup) {
        router.push('/onboarding/avatar');
        return;
      }

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push('/auth/sign-in?next=/onboarding/username');
        return;
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ username: normalizeUsername(value) })
        .eq('id', auth.user.id);

      if (dbError) {
        // Generic message to avoid leaking which usernames are registered.
        setError("Couldn't save. Try a different handle.");
        return;
      }

      router.push('/onboarding/avatar');
    });
  };

  return (
    <>
      <UsernameField value={value} onChange={setValue} disabled={pending} />

      {error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood" role="alert">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} size="xl" fullWidth disabled={pending} className="mt-auto">
        {pending ? 'Saving…' : 'Continue →'}
      </Button>
    </>
  );
}
