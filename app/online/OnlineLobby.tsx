'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Heart, PartyPopper, Leaf, Flame, Plus, LogIn, Zap, X } from 'lucide-react';
import { GameBanner } from '@/components/layout/GameBanner';
import { ROUND_OPTIONS, type RoomMode, type RoomSpice } from '@/lib/rooms';
import { cn } from '@/lib/utils';

const MODES: { id: RoomMode; label: string; icon: React.ReactNode }[] = [
  { id: 'family', label: 'Family', icon: <Users className="w-6 h-6" /> },
  { id: 'couple', label: 'Couple', icon: <Heart className="w-6 h-6" /> },
  { id: 'group',  label: 'Group',  icon: <PartyPopper className="w-6 h-6" /> },
];

interface OnlineLobbyProps {
  spicyAllowed?: boolean;
}

export function OnlineLobby({ spicyAllowed = false }: OnlineLobbyProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<RoomMode>('group');
  const [spice, setSpice] = useState<RoomSpice>('mild');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [maxRounds, setMaxRounds] = useState<number>(5);
  const [quickMode, setQuickMode] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleSpicyClick = () => {
    if (spicyAllowed) {
      setSpice('spicy');
    } else {
      setShowPremiumModal(true);
    }
  };

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
          body: JSON.stringify({
            mode, spice, locale: 'en',
            displayName: displayName.trim(),
            maxRounds, quickMode,
          }),
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
        <GameBanner variant="hero" subtitle="Live multiplayer" />
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
              onClick={handleSpicyClick}
              aria-haspopup={spicyAllowed ? undefined : 'dialog'}
              className={cn(
                'border-2 p-4 flex items-center gap-3 transition-colors relative',
                spice === 'spicy'
                  ? 'border-blood bg-blood/10 text-fg'
                  : 'border-line text-fg hover:border-blood',
                !spicyAllowed && 'cursor-pointer'
              )}
              type="button"
            >
              <Flame className="w-5 h-5 text-blood" />
              <div className="text-left">
                <div className="font-display font-black uppercase tracking-tight">Spicy</div>
                <div className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
                  {spicyAllowed ? 'Premium' : 'Tap to unlock'}
                </div>
              </div>
              <span className="absolute top-1.5 right-1.5 font-mono text-[9px] tracking-widest font-bold bg-mustard text-bg px-1.5 py-0.5">PRO</span>
            </button>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">Rounds</h2>
          <div className="grid grid-cols-4 gap-2">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxRounds(n)}
                aria-pressed={maxRounds === n}
                className={cn(
                  'border-2 py-2 font-display font-black text-base transition-colors',
                  maxRounds === n
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line text-fg hover:border-fg'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <button
            type="button"
            onClick={() => setQuickMode((v) => !v)}
            aria-pressed={quickMode}
            className={cn(
              'w-full border-2 px-4 py-3 flex items-center gap-3 transition-colors',
              quickMode
                ? 'border-acid bg-acid/10 text-fg'
                : 'border-line text-fg hover:border-acid'
            )}
          >
            <Zap className={cn('w-5 h-5', quickMode ? 'text-acid' : 'text-fg-muted')} />
            <div className="flex-1 text-left">
              <p className="font-display font-black uppercase tracking-tight">Quick mode</p>
              <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
                {quickMode
                  ? 'On · everyone votes at the same time'
                  : 'Off · one player on the spot at a time'}
              </p>
            </div>
            <span
              className={cn(
                'w-10 h-6 border-2 relative transition-colors',
                quickMode ? 'border-acid bg-acid' : 'border-line'
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-bg transition-transform',
                  quickMode ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </span>
          </button>
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

      {showPremiumModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="spicy-paywall-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowPremiumModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-bg border-2 border-fg rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-bg-card text-fg-muted hover:text-fg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-8 pb-6 text-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ backgroundImage: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)' }}
                aria-hidden="true"
              >
                <Flame className="w-8 h-8 text-white" />
              </div>
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
                Premium feature
              </p>
              <h2
                id="spicy-paywall-title"
                className="font-display text-3xl font-black leading-tight tracking-tight mb-3"
              >
                Spicy is for<br />
                <span className="italic font-light">Pros only.</span>
              </h2>
              <p className="font-body text-sm text-fg-muted leading-relaxed mb-6">
                Adult-only questions, advanced detector, unlimited history, and the gold cap.
                Cancel anytime.
              </p>

              <div className="flex flex-col gap-2">
                <Link
                  href="/premium"
                  className="w-full border-2 border-mustard bg-mustard text-bg font-display font-black uppercase tracking-tight py-3 inline-flex items-center justify-center hover:bg-bg hover:text-mustard transition-colors rounded-lg"
                >
                  See Premium
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg py-2"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
