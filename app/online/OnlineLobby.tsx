'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Heart, PartyPopper, Leaf, Flame, Plus, LogIn } from 'lucide-react';
import type { RoomMode, RoomSpice } from '@/lib/rooms';
import { cn } from '@/lib/utils';

const MODES: { id: RoomMode; label: string; icon: React.ReactNode }[] = [
  { id: 'family', label: 'Family', icon: <Users className="w-6 h-6" /> },
  { id: 'couple', label: 'Couple', icon: <Heart className="w-6 h-6" /> },
  { id: 'group',  label: 'Group',  icon: <PartyPopper className="w-6 h-6" /> },
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
    <main className="min-h-screen flex flex-col bg-bg">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full pb-24">
        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block"
        >
          ← home
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Live Multiplayer
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-2">
          Each phone<br />
          <span className="italic font-light">a player.</span>
        </h1>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-8">
          Invite by code, link or QR.
        </p>

        <section className="mb-6">
          <label className="block font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Your name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
            placeholder="What should we call you?"
            className="w-full px-4 py-3 bg-bg-card border-2 border-line focus:border-mustard outline-none text-fg placeholder:text-fg-muted font-display"
            maxLength={20}
          />
        </section>

        <section className="mb-6">
          <h2 className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">Mode</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'border-2 p-4 transition-colors flex flex-col items-center gap-2',
                  mode === m.id
                    ? 'border-mustard bg-mustard text-bg'
                    : 'border-line text-fg hover:border-mustard'
                )}
                type="button"
              >
                {m.icon}
                <span className="font-display text-sm font-black uppercase tracking-tight">{m.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">Spice</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSpice('mild')}
              className={cn(
                'border-2 p-4 flex items-center gap-3 transition-colors',
                spice === 'mild'
                  ? 'border-acid bg-acid/10 text-fg'
                  : 'border-line text-fg hover:border-acid'
              )}
              type="button"
            >
              <Leaf className="w-5 h-5 text-acid" />
              <div className="text-left">
                <div className="font-display font-black uppercase tracking-tight">Mild</div>
                <div className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">All ages 16+</div>
              </div>
            </button>
            <button
              onClick={() => setSpice('spicy')}
              className={cn(
                'border-2 p-4 flex items-center gap-3 transition-colors relative',
                spice === 'spicy'
                  ? 'border-blood bg-blood/10 text-fg'
                  : 'border-line text-fg hover:border-blood'
              )}
              type="button"
            >
              <Flame className="w-5 h-5 text-blood" />
              <div className="text-left">
                <div className="font-display font-black uppercase tracking-tight">Spicy</div>
                <div className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">Premium</div>
              </div>
              <span className="absolute top-1.5 right-1.5 font-mono text-[9px] tracking-widest font-bold bg-mustard text-bg px-1.5 py-0.5">PRO</span>
            </button>
          </div>
        </section>

        <section className="mb-6">
          <button
            onClick={handleCreate}
            disabled={pending}
            className="w-full border-2 border-mustard bg-mustard text-bg font-display font-black text-base uppercase tracking-tight py-4 inline-flex items-center justify-center gap-2 hover:bg-bg hover:text-mustard transition-colors disabled:opacity-60"
            type="button"
          >
            <Plus className="w-5 h-5" />
            {pending ? 'Creating…' : 'Create room'}
          </button>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
            Or join with code
          </h2>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="ABC123"
              className="flex-1 px-4 py-3 bg-bg-card border-2 border-line focus:border-mustard outline-none text-fg placeholder:text-fg-muted font-display font-black text-center tracking-widest text-lg uppercase"
              maxLength={8}
            />
            <button
              onClick={handleJoin}
              disabled={pending}
              className="px-5 border-2 border-fg bg-fg text-bg font-display font-black uppercase tracking-tight inline-flex items-center gap-2 disabled:opacity-60 hover:bg-bg hover:text-fg transition-colors"
              type="button"
            >
              <LogIn className="w-4 h-4" /> Join
            </button>
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
