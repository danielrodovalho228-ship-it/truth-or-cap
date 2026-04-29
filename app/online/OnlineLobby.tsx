'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Heart, PartyPopper, Leaf, Flame, Plus, LogIn } from 'lucide-react';
import type { RoomMode, RoomSpice } from '@/lib/rooms';

const MODES: { id: RoomMode; label: string; icon: React.ReactNode; gradient: string }[] = [
  { id: 'family', label: 'Family', icon: <Users className="w-6 h-6" />, gradient: 'from-amber-400 to-rose-500' },
  { id: 'couple', label: 'Couple', icon: <Heart className="w-6 h-6" />, gradient: 'from-pink-500 to-purple-600' },
  { id: 'group', label: 'Group',  icon: <PartyPopper className="w-6 h-6" />, gradient: 'from-fuchsia-500 to-violet-600' },
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
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-violet-50 pb-32">
      <header className="px-5 pt-8 pb-6">
        <h1 className="font-display text-3xl font-black text-violet-900">Live Multiplayer</h1>
        <p className="text-violet-700/80 text-sm mt-1">
          Each phone is a player. Invite by code, link or QR.
        </p>
      </header>

      <section className="px-5">
        <label className="block text-xs font-mono uppercase tracking-widest text-violet-700/70 mb-2">
          Your name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
          placeholder="What should we call you?"
          className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-pink-200 focus:border-pink-500 outline-none text-violet-900 placeholder:text-violet-400"
          maxLength={20}
        />
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-700/70 mb-2">Mode</h2>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`relative rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${m.gradient} ${
                mode === m.id ? 'ring-4 ring-pink-500 scale-105' : 'opacity-80 hover:opacity-100'
              } transition`}
              type="button"
            >
              <div className="flex flex-col items-center gap-2">
                {m.icon}
                <span className="text-sm font-bold">{m.label}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-700/70 mb-2">Spice</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSpice('mild')}
            className={`rounded-2xl p-4 bg-white border-2 ${
              spice === 'mild' ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-pink-200'
            } flex items-center gap-3`}
            type="button"
          >
            <Leaf className="w-5 h-5 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-violet-900">Mild</div>
              <div className="text-xs text-violet-700/70">All ages 16+</div>
            </div>
          </button>
          <button
            onClick={() => setSpice('spicy')}
            className={`rounded-2xl p-4 bg-white border-2 ${
              spice === 'spicy' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-pink-200'
            } flex items-center gap-3 relative`}
            type="button"
          >
            <Flame className="w-5 h-5 text-rose-600" />
            <div className="text-left">
              <div className="font-bold text-violet-900">Spicy</div>
              <div className="text-xs text-violet-700/70">Premium</div>
            </div>
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">PRO</span>
          </button>
        </div>
      </section>

      <section className="px-5 mt-8">
        <button
          onClick={handleCreate}
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-white font-bold text-lg bg-gradient-to-r from-pink-500 to-violet-600 shadow-xl active:scale-95 transition disabled:opacity-60"
        >
          <Plus className="w-5 h-5" /> {pending ? 'Creating...' : 'Create room'}
        </button>
      </section>

      <section className="px-5 mt-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-700/70 mb-2">
          Or join with code
        </h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="ABC123"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border-2 border-pink-200 focus:border-pink-500 outline-none text-violet-900 placeholder:text-violet-400 font-mono text-center tracking-widest text-lg uppercase"
            maxLength={8}
          />
          <button
            onClick={handleJoin}
            disabled={pending}
            className="px-5 rounded-2xl bg-violet-600 text-white font-bold flex items-center gap-2 disabled:opacity-60"
            type="button"
          >
            <LogIn className="w-4 h-4" /> Join
          </button>
        </div>
      </section>

      {error ? (
        <p className="mx-5 mt-4 px-4 py-3 rounded-2xl bg-rose-100 text-rose-700 text-sm font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
