'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ContactCard } from '@/components/onboarding/ContactCard';
import {
  hasContactsApi,
  pickContactsViaApi,
  hashContacts,
  findMatchingUsers,
  type MatchedFriend,
} from '@/lib/contacts';

type Phase = 'intro' | 'matching' | 'matched' | 'manual' | 'no-matches';

export function FriendsClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [friends, setFriends] = useState<MatchedFriend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualPhones, setManualPhones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runMatch = async (phones: string[]) => {
    setError(null);
    if (phones.length === 0) {
      setPhase('no-matches');
      return;
    }
    setPhase('matching');
    try {
      const hashes = await hashContacts(phones);
      if (hashes.length === 0) {
        setPhase('no-matches');
        return;
      }
      const { matched } = await findMatchingUsers(hashes);
      setFriends(matched);
      // Pre-select all so the default is "add everyone"
      setSelected(new Set(matched.map((m) => m.id)));
      setPhase(matched.length > 0 ? 'matched' : 'no-matches');
    } catch (err) {
      console.error('[friends] match failed', err);
      setError('Could not check contacts. Try again or skip.');
      setPhase('intro');
    }
  };

  const useNativePicker = async () => {
    if (!hasContactsApi()) {
      setPhase('manual');
      return;
    }
    const phones = await pickContactsViaApi();
    if (phones.length === 0) {
      setPhase('manual');
      return;
    }
    void runMatch(phones);
  };

  const submitManual = () => {
    const phones = manualPhones
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    void runMatch(phones);
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const finish = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      router.push('/onboarding/done');
      return;
    }
    startTransition(async () => {
      try {
        await fetch('/api/friendships/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendIds: ids, source: 'contact' }),
        });
      } catch (err) {
        console.error('[friends] bulk add', err);
      }
      router.push('/onboarding/done');
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {phase === 'intro' && (
        <>
          <div className="border-2 border-line p-4 mb-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
              Privacy
            </p>
            <p className="font-body text-sm leading-snug">
              We hash phone numbers on this device. Servers only see fingerprints, never real numbers.
            </p>
          </div>

          {hasContactsApi() ? (
            <Button onClick={useNativePicker} size="lg" fullWidth className="mb-3">
              <span className="inline-flex items-center gap-2 justify-center">
                <Users className="w-5 h-5" /> Pick from contacts
              </span>
            </Button>
          ) : null}

          <Button
            onClick={() => setPhase('manual')}
            variant="secondary"
            size="lg"
            fullWidth
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <Plus className="w-5 h-5" /> Paste numbers manually
            </span>
          </Button>

          {error ? (
            <p className="font-mono text-xs tracking-widest uppercase text-blood mt-3" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}

      {phase === 'manual' && (
        <>
          <Label htmlFor="phones">Phone numbers</Label>
          <textarea
            id="phones"
            value={manualPhones}
            onChange={(e) => setManualPhones(e.target.value)}
            placeholder="+1 415 555 0123&#10;+44 20 7946 0958&#10;+5511999999999"
            rows={5}
            className="w-full bg-transparent border-2 border-line text-fg font-mono text-sm p-3 placeholder:text-fg-muted focus:outline-none focus:border-fg resize-none mb-1"
          />
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-4">
            One per line. Include your country code (e.g. +1, +44, +55).
          </p>
          <Button onClick={submitManual} size="lg" fullWidth>
            Check matches
          </Button>
        </>
      )}

      {phase === 'matching' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-mustard border-t-transparent rounded-full" />
        </div>
      )}

      {phase === 'matched' && friends.length > 0 && (
        <>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'} already playing
          </p>

          <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
            {friends.map((f) => (
              <ContactCard
                key={f.id}
                friend={f}
                selected={selected.has(f.id)}
                onToggle={() => toggle(f.id)}
              />
            ))}
          </div>

          <Button onClick={finish} size="lg" fullWidth disabled={pending} className="mt-auto">
            {pending
              ? 'Adding…'
              : selected.size === 0
              ? 'Skip · Continue →'
              : `Add ${selected.size} → Continue`}
          </Button>
        </>
      )}

      {phase === 'no-matches' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="font-display text-3xl font-black leading-tight mb-2">
            No friends found yet.
          </p>
          <p className="font-body text-base text-fg-muted leading-relaxed mb-6 max-w-xs">
            Be the first in your circle. The squad detector unlocks at 5 friends.
          </p>
          <Button onClick={() => router.push('/onboarding/done')} size="lg" fullWidth>
            Continue →
          </Button>
        </div>
      )}
    </div>
  );
}
