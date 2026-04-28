'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface DeleteAccountClientProps {
  username: string;
}

export function DeleteAccountClient({ username }: DeleteAccountClientProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = confirmation.trim().toLowerCase() === username.toLowerCase();

  const remove = () => {
    setError(null);
    if (!matches) {
      setError('Type your username exactly.');
      return;
    }
    startTransition(async () => {
      const resp = await fetch('/api/account/delete', { method: 'POST' });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error ?? 'Could not delete. Try again.');
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/settings" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← Settings
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-blood mb-3">Danger zone</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-4">
          Delete<br />
          <span className="italic font-light">everything?</span>
        </h1>
        <p className="font-body text-sm text-fg-muted leading-relaxed mb-6">
          This deletes your profile, recordings, votes, invites, friendships, voice baseline, and avatar
          — permanently. Cannot be undone. LGPD/GDPR compliant.
        </p>

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
          Type <span className="text-fg">{username}</span> to confirm
        </p>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={username}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mb-3"
          invalid={confirmation.length > 0 && !matches}
        />

        {error ? (
          <p className="font-mono text-xs uppercase tracking-widest text-blood mb-3" role="alert">{error}</p>
        ) : null}

        <Button onClick={remove} variant="destructive" size="lg" fullWidth disabled={!matches || pending}>
          {pending ? 'Deleting…' : 'Delete account permanently'}
        </Button>
        <Link href="/settings" className="block text-center font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg mt-4">
          Cancel
        </Link>
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
