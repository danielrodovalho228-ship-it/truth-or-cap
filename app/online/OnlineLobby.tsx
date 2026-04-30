'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Heart, PartyPopper, Leaf, Flame, Plus, LogIn } from 'lucide-react';
import type { RoomMode, RoomSpice } from '@/lib/rooms';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const MODES: { id: RoomMode; label: string; icon: React.ReactNode; tagline: string }[] = [
  { id: 'family', label: 'Family', icon: <Users className="w-5 h-5" />, tagline: 'PG. Kids welcome.' },
  { id: 'couple', label: 'Couple', icon: <Heart className="w-5 h-5" />, tagline: 'Date-night honesty.' },
  { id: 'group',  label: 'Group',  icon: <PartyPopper className="w-5 h-5" />, tagline: 'Group nights.' },
];

export function OnlineLobby() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<RoomMode>('group');
  const [spice, setSpice] = useState<RoomSpice>('mild');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Choose a display name first');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, spice, locale: 'en', displayName: displayName.trim() }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Failed to create room');
        try {
          window.localStorage.setItem(`tlc:player:${j.room.code}`, j.player.id);
          window.localStorage.setItem('tlc:displayName', displayName.trim());
        } catch { /* localStorage blocked */ }
        router.push(`/room/${j.room.code}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create room');
      }
    });
  };

  const handleJoin = () => {
    setError(null);
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Type a room code');
      return;
    }
    if (!displayName.trim()) {
      setError('Choose a display name first');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: trimmedCode, displayName: displayName.trim() }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Failed to join');
        try {
          window.localStorage.setItem(`tlc:player:${j.room.code}`, j.player.id);
          window.localStorage.setItem('tlc:displayName', displayName.trim());
        } catch { /* */ }
        router.push(`/room/${j.room.code}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join room');
      }
    });
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full pb-24">
        <Link
          href="/home"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block"
        >
          ← truthorcap
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Live Multiplayer
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] tracking-tight mb-3">
          Phones<br />
          <span className="italic font-light">on trial.</span>
        </h1>
        <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
          Each phone is a player. Create a room and invite by code, link or QR — up to 10 players.
        </p>

        <section className="mb-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Your name
          </p>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
            placeholder="What should we call you?"
            className="w-full px-4 py-3 bg-bg-card border-2 border-line focus:border-fg outline-none text-fg placeholder:text-fg-muted font-body"
            maxLength={20}
          />
        </section>

        <section className="mb-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Mode
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'border-2 py-3 px-2 text-center transition-colors',
                  mode === m.id ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-fg'
                )}
                type="button"
              >
                <div className="flex justify-center mb-1">{m.icon}</div>
                <p className="font-display text-base font-black uppercase tracking-tight">{m.label}</p>
                <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5 opacity-70">
                  {m.tagline}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Spice
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSpice('mild')}
              className={cn(
                'border-2 py-3 px-3 flex items-center gap-3 transition-colors text-left',
                spice === 'mild' ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-fg'
              )}
              type="button"
            >
              <Leaf className="w-5 h-5" />
              <div>
                <p className="font-display text-base font-black uppercase tracking-tight">Mild</p>
                <p className="font-mono text-[9px] tracking-widest uppercase opacity-70">All ages 16+</p>
              </div>
            </button>
            <button
              onClick={() => setSpice('spicy')}
              className={cn(
                'relative border-2 py-3 px-3 flex items-center gap-3 transition-colors text-left',
                spice === 'spicy' ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-fg'
              )}
              type="button"
            >
              <Flame className="w-5 h-5" />
              <div>
                <p className="font-display text-base font-black uppercase tracking-tight">Spicy</p>
                <p className="font-mono text-[9px] tracking-widest uppercase opacity-70">Premium</p>
              </div>
              <span className="absolute top-1.5 right-1.5 font-mono text-[9px] tracking-widest uppercase bg-mustard text-bg px-1.5 py-0.5">
                Pro
              </span>
            </button>
          </div>
        </section>

        <section className="mb-8">
          <Button onClick={handleCreate} disabled={pending} size="lg" fullWidth>
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> {pending ? 'Creating…' : 'Create room'}
            </span>
          </Button>
        </section>

        <section className="mb-2">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Or join with code
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="ABC123"
              className="flex-1 px-4 py-3 bg-bg-card border-2 border-line focus:border-fg outline-none text-fg placeholder:text-fg-muted font-mono text-center tracking-[0.3em] text-lg uppercase"
              maxLength={8}
            />
            <Button onClick={handleJoin} disabled={pending} variant="secondary" size="md">
              <span className="inline-flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Join
              </span>
            </Button>
          </div>
        </section>

        {error ? (
          <p
            className="mt-4 px-4 py-3 border-2 border-blood bg-blood/10 text-blood font-mono text-xs tracking-widest uppercase"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}
