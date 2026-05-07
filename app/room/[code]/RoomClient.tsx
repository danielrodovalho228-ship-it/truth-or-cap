'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { GameBanner } from '@/components/layout/GameBanner';
import {
  Crown,
  Users,
  Copy,
  Play,
  CheckCircle2,
  XCircle,
  Share2,
  X,
  MessageCircle,
  Music2,
  Instagram,
  Twitter,
  LogIn,
  Zap,
  PenLine,
} from 'lucide-react';
import type { Room, RoomPlayer, RoomRound, RoundVote } from '@/lib/rooms';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  initialRoom: Room;
  initialPlayers: RoomPlayer[];
  initialRound: RoomRound | null;
}

export function RoomClient({ initialRoom, initialPlayers, initialRound }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<RoomPlayer[]>(initialPlayers);
  const [round, setRound] = useState<RoomRound | null>(initialRound);
  const [votes, setVotes] = useState<RoundVote[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [joinChecked, setJoinChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Host-only lobby form: who's the next prompter + optional custom question.
  const [selectedPrompterId, setSelectedPrompterId] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  useEffect(() => {
    try {
      const id = window.localStorage.getItem(`tlc:player:${room.code}`);
      if (id) {
        const stillHere = initialPlayers.some((p) => p.id === id && !p.left_at);
        if (stillHere) {
          setMyPlayerId(id);
        } else {
          try { window.localStorage.removeItem(`tlc:player:${room.code}`); } catch { /* */ }
        }
      }
    } catch { /* */ }
    setJoinChecked(true);
  }, [room.code, initialPlayers]);

  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPlayers((prev) => prev.some(p => p.id === (payload.new as RoomPlayer).id) ? prev : [...prev, payload.new as RoomPlayer]);
        } else if (payload.eventType === 'UPDATE') {
          setPlayers((prev) => prev.map(p => p.id === (payload.new as RoomPlayer).id ? (payload.new as RoomPlayer) : p));
        } else if (payload.eventType === 'DELETE') {
          setPlayers((prev) => prev.filter(p => p.id !== (payload.old as RoomPlayer).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (payload) => {
        if (payload.new) setRoom(payload.new as Room);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_rounds', filter: `room_id=eq.${room.id}` }, (payload) => {
        setRound(payload.new as RoomRound);
        setVotes([]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_rounds', filter: `room_id=eq.${room.id}` }, (payload) => {
        setRound((prev) => prev && prev.id === (payload.new as RoomRound).id ? (payload.new as RoomRound) : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, room.id]);

  useEffect(() => {
    if (!myPlayerId) return;
    const ch = supabase.channel(`presence:${room.id}`, {
      config: { presence: { key: myPlayerId } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const ids = new Set(Object.keys(state));
      setPresentIds(ids);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ playerId: myPlayerId, joinedAt: new Date().toISOString() });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [supabase, room.id, myPlayerId]);

  useEffect(() => {
    if (!myPlayerId) return;
    const handler = () => {
      const blob = new Blob(
        [JSON.stringify({ roomId: room.id, playerId: myPlayerId })],
        { type: 'application/json' },
      );
      navigator.sendBeacon('/api/room/leave', blob);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [room.id, myPlayerId]);

  useEffect(() => {
    if (!round) { setVotes([]); return; }
    let cancelled = false;
    supabase.from('round_votes').select('*').eq('round_id', round.id).then(({ data }) => {
      if (!cancelled && data) setVotes(data);
    });

    const ch = supabase
      .channel(`round-votes:${round.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'round_votes', filter: `round_id=eq.${round.id}` },
        (payload) => {
          const v = payload.new as RoundVote;
          setVotes((prev) => prev.some(x => x.id === v.id) ? prev : [...prev, v]);
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [supabase, round?.id]);

  const me = players.find(p => p.id === myPlayerId);
  const host = players.find(p => p.is_host);
  const iAmHost = me?.is_host ?? false;
  const iAmPrompter = !!round && !!me && round.prompter_player_id === me.id;
  const myVote = round ? votes.find(v => v.voter_player_id === myPlayerId)?.vote : null;
  const activePlayers = players.filter(p => !p.left_at);

  // Eligible voters depend on mode. Quick mode: every active player votes
  // (no prompter to skip). Classic mode: skip the prompter.
  const eligibleVoters = activePlayers.filter(p => {
    if (round && round.prompter_player_id && p.id === round.prompter_player_id) return false;
    if (!p.user_id) return presentIds.has(p.id);
    return true;
  });
  const allVoted = !!round && eligibleVoters.length > 0 && votes.length >= eligibleVoters.length;

  const isQuickMode = room.quick_mode;
  const minPlayers = room.min_players ?? 2;
  const enoughPlayers = activePlayers.length >= minPlayers;
  const roundActive = !!round && !round.revealed_at;
  const gameFinished = room.current_round >= room.max_rounds && !!round?.revealed_at;
  const canStartNext = !roundActive && !gameFinished;

  // Default the prompter dropdown to a rotating active player.
  useEffect(() => {
    if (!iAmHost || isQuickMode) return;
    if (selectedPrompterId && activePlayers.some(p => p.id === selectedPrompterId)) return;
    if (activePlayers.length === 0) return;
    const sorted = [...activePlayers].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    const idx = room.current_round % sorted.length;
    setSelectedPrompterId(sorted[idx]?.id ?? sorted[0].id);
  }, [iAmHost, isQuickMode, selectedPrompterId, activePlayers, room.current_round]);

  const updateLobby = (patch: { quickMode?: boolean; maxRounds?: number }) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room.id, ...patch }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Could not update');
        if (j.room) setRoom(j.room);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update room');
      }
    });
  };

  const startNextRound = () => {
    setError(null);
    if (!iAmHost) return;
    if (!enoughPlayers) {
      setError(`Need at least ${minPlayers} players to start`);
      return;
    }

    const trimmedCustom = customQuestion.trim();
    let prompterPlayerId: string | null = null;
    if (!isQuickMode) {
      prompterPlayerId = selectedPrompterId;
      if (!prompterPlayerId) {
        const sorted = [...activePlayers].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
        prompterPlayerId = sorted[room.current_round % sorted.length]?.id ?? null;
      }
      if (!prompterPlayerId) {
        setError('Pick a player to put on the spot');
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/room/round/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            prompterPlayerId,
            customQuestion: trimmedCustom || undefined,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Failed to start round');
        setCustomQuestion('');
        setShowCustom(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start round');
      }
    });
  };

  const declare = (answer: 'truth' | 'cap') => {
    if (!round || !myPlayerId) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/round/declare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId: round.id, playerId: myPlayerId, declaredAnswer: answer }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Failed to declare');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not declare');
      }
    });
  };

  const castVote = (vote: 'truth' | 'cap') => {
    if (!round || !myPlayerId) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/round/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId: round.id, voterPlayerId: myPlayerId, vote }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Vote failed');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Vote failed');
      }
    });
  };

  const reveal = () => {
    if (!round) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/round/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId: round.id }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Reveal failed');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reveal failed');
      }
    });
  };

  const shareUrl = (): string => `${window.location.origin}/room/${room.code}`;
  const shareMessage = (): string => `Join my Truth or Cap game! 🎭 ${shareUrl()}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* */ }
  };

  const openShare = () => setShareOpen(true);

  if (joinChecked && !myPlayerId) {
    return (
      <JoinGate
        roomCode={room.code}
        onJoined={(playerId) => {
          setMyPlayerId(playerId);
          try { window.localStorage.setItem(`tlc:player:${room.code}`, playerId); } catch { /* */ }
        }}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full pb-24">
        <GameBanner subtitle={`Room ${room.code}`} />
        <Link
          href="/online"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block"
        >
          ← lobby
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          {room.mode} · {room.spice} · round {room.current_round} of {room.max_rounds}
          {isQuickMode ? ' · quick' : ''}
        </p>
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="font-display text-5xl font-black leading-[0.9] tracking-[0.1em]">
            {room.code}
          </h1>
          <button
            onClick={openShare}
            className="border-2 border-line hover:border-fg px-3 py-2 font-mono text-[10px] tracking-widest uppercase text-fg flex items-center gap-1.5 transition-colors"
            type="button"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-fg-muted" />
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
              {activePlayers.length}/{room.max_players ?? 10} players
              {!enoughPlayers && room.current_round === 0
                ? ` · need ${minPlayers}+`
                : ''}
            </p>
          </div>
          <ul className="space-y-2">
            {players.map((p) => {
              const playerVote = votes.find(v => v.voter_player_id === p.id);
              const isMe = p.id === myPlayerId;
              const isPrompter = round && p.id === round.prompter_player_id;
              return (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 border-2 px-4 py-3 transition-colors',
                    isMe ? 'border-fg' : 'border-line',
                    p.left_at ? 'opacity-50' : ''
                  )}
                >
                  <div className="w-8 h-8 border-2 border-line flex items-center justify-center font-display font-black text-base text-fg">
                    {p.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg font-black leading-tight truncate">
                      {p.display_name}
                      {isMe ? (
                        <span className="font-mono text-[9px] tracking-widest uppercase text-mustard ml-2">
                          you
                        </span>
                      ) : null}
                    </p>
                    {isPrompter ? (
                      <p className="font-mono text-[9px] tracking-widest uppercase text-blood mt-0.5">
                        on the spot
                      </p>
                    ) : null}
                  </div>
                  {p.is_host ? <Crown className="w-4 h-4 text-mustard" /> : null}
                  {round && playerVote && !round.revealed_at ? (
                    <CheckCircle2 className="w-4 h-4 text-acid" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Lobby controls — only host, only before any round runs. */}
        {iAmHost && room.current_round === 0 && !round ? (
          <LobbySettings
            room={room}
            disabled={pending}
            onUpdate={updateLobby}
          />
        ) : null}

        {round ? (
          <RoundView
            round={round}
            quickMode={isQuickMode}
            isPrompter={iAmPrompter}
            myVote={myVote}
            votes={votes}
            players={players}
            eligibleVoters={eligibleVoters.length}
            onDeclare={declare}
            onVote={castVote}
            onReveal={reveal}
            iAmHost={iAmHost}
            allVoted={allVoted}
          />
        ) : null}

        {iAmHost && canStartNext ? (
          <section className="mt-6 space-y-4">
            {!isQuickMode && activePlayers.length > 0 ? (
              <div>
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
                  Put on the spot
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {activePlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPrompterId(p.id)}
                      type="button"
                      className={cn(
                        'border-2 px-3 py-2 text-left transition-colors',
                        selectedPrompterId === p.id
                          ? 'border-mustard bg-mustard text-bg'
                          : 'border-line text-fg hover:border-mustard'
                      )}
                    >
                      <span className="font-display font-black text-sm uppercase tracking-tight truncate block">
                        {p.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <button
                type="button"
                onClick={() => setShowCustom((v) => !v)}
                className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg inline-flex items-center gap-1.5"
              >
                <PenLine className="w-3 h-3" />
                {showCustom ? 'Use a random question' : 'Write your own question'}
              </button>
              {showCustom ? (
                <textarea
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value.slice(0, 240))}
                  placeholder={
                    isQuickMode
                      ? 'A statement everyone votes on…'
                      : 'A question for the player on the spot…'
                  }
                  rows={2}
                  className="mt-2 w-full px-3 py-2 bg-bg-card border-2 border-line focus:border-mustard outline-none text-fg placeholder:text-fg-muted font-display text-base resize-none"
                  maxLength={240}
                />
              ) : null}
            </div>

            <Button
              onClick={startNextRound}
              disabled={pending || !enoughPlayers}
              size="lg"
              fullWidth
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                {pending
                  ? 'Starting…'
                  : !enoughPlayers
                  ? `Waiting for players… (${activePlayers.length}/${minPlayers})`
                  : room.current_round === 0
                  ? 'Start game'
                  : 'Start next round'}
              </span>
            </Button>
          </section>
        ) : null}

        {!iAmHost && host && !round ? (
          <p className="mt-6 font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted text-center">
            Waiting for {host.display_name} to start…
          </p>
        ) : null}

        {gameFinished ? (
          <p className="mt-6 font-mono text-[10px] tracking-[0.4em] uppercase text-acid text-center">
            Game over · {room.max_rounds} rounds played
          </p>
        ) : null}

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

      {shareOpen ? (
        <ShareSheet
          roomCode={room.code}
          shareUrl={shareUrl()}
          shareMessage={shareMessage()}
          copied={copied}
          onCopy={copyLink}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </main>
  );
}

interface LobbySettingsProps {
  room: Room;
  disabled: boolean;
  onUpdate: (patch: { quickMode?: boolean; maxRounds?: number }) => void;
}

function LobbySettings({ room, disabled, onUpdate }: LobbySettingsProps) {
  const ROUNDS = [5, 10, 15, 20];
  return (
    <section className="mb-6 border-2 border-line p-4 bg-bg-card">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        Lobby · host only
      </p>

      <div className="mb-4">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
          Rounds
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ROUNDS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onUpdate({ maxRounds: n })}
              className={cn(
                'border-2 py-2 font-display font-black text-base transition-colors disabled:opacity-60',
                room.max_rounds === n
                  ? 'border-fg bg-fg text-bg'
                  : 'border-line text-fg hover:border-fg'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onUpdate({ quickMode: !room.quick_mode })}
          aria-pressed={room.quick_mode}
          className={cn(
            'w-full border-2 px-4 py-3 flex items-center gap-3 transition-colors disabled:opacity-60',
            room.quick_mode
              ? 'border-acid bg-acid/10 text-fg'
              : 'border-line text-fg hover:border-acid'
          )}
        >
          <Zap className={cn('w-5 h-5', room.quick_mode ? 'text-acid' : 'text-fg-muted')} />
          <div className="flex-1 text-left">
            <p className="font-display font-black uppercase tracking-tight">Quick mode</p>
            <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
              {room.quick_mode
                ? 'On · everyone votes at the same time'
                : 'Off · one player at a time'}
            </p>
          </div>
          <span
            className={cn(
              'w-10 h-6 border-2 relative transition-colors',
              room.quick_mode ? 'border-acid bg-acid' : 'border-line'
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'absolute top-0.5 w-4 h-4 bg-bg transition-transform',
                room.quick_mode ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </span>
        </button>
      </div>
    </section>
  );
}

interface JoinGateProps {
  roomCode: string;
  onJoined: (playerId: string) => void;
}

function JoinGate({ roomCode, onJoined }: JoinGateProps) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem('tlc:displayName');
      if (cached) setName(cached);
    } catch { /* */ }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Type your name to join');
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, displayName: trimmed }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed to join');
      try {
        window.localStorage.setItem('tlc:displayName', trimmed);
      } catch { /* */ }
      onJoined(j.player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join room');
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full flex flex-col justify-center">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Room invite
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-2">
          Join<br />
          <span className="italic font-light">{roomCode}.</span>
        </h1>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-8">
          Enter your name to join the lobby.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="What should we call you?"
              autoFocus
              className="w-full px-4 py-3 bg-bg-card border-2 border-line focus:border-mustard outline-none text-fg placeholder:text-fg-muted font-display"
              maxLength={20}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full border-2 border-mustard bg-mustard text-bg font-display font-black text-base uppercase tracking-tight py-4 inline-flex items-center justify-center gap-2 hover:bg-bg hover:text-mustard transition-colors disabled:opacity-60"
          >
            <LogIn className="w-5 h-5" />
            {pending ? 'Joining…' : 'Join room'}
          </button>
        </form>

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

interface ShareSheetProps {
  roomCode: string;
  shareUrl: string;
  shareMessage: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

function ShareSheet({ roomCode, shareUrl, shareMessage, copied, onCopy, onClose }: ShareSheetProps) {
  const [hint, setHint] = useState<string | null>(null);

  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Join my Truth or Cap game! 🎭')}&url=${encodeURIComponent(shareUrl)}`;

  const copyForApp = async (label: string) => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setHint(`Link copied! Paste it on ${label}.`);
      setTimeout(() => setHint(null), 2500);
    } catch {
      setHint('Could not copy link');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-fg/40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-bg-card border-t-2 sm:border-2 border-fg p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard">
            Invite to {roomCode}
          </p>
          <button
            onClick={onClose}
            type="button"
            className="text-fg-muted hover:text-fg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="font-display text-2xl font-black leading-tight mb-5">
          Share the room.
        </h2>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <ShareButton
            label="WhatsApp"
            color="acid"
            icon={<MessageCircle className="w-5 h-5" />}
            href={waUrl}
          />
          <ShareButton
            label="X"
            color="fg"
            icon={<Twitter className="w-5 h-5" />}
            href={xUrl}
          />
          <ShareButton
            label="Instagram"
            color="blood"
            icon={<Instagram className="w-5 h-5" />}
            onClick={() => copyForApp('Instagram')}
          />
          <ShareButton
            label="TikTok"
            color="mustard"
            icon={<Music2 className="w-5 h-5" />}
            onClick={() => copyForApp('TikTok')}
          />
        </div>

        <button
          onClick={onCopy}
          type="button"
          className="w-full border-2 border-line hover:border-fg px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-fg flex items-center justify-center gap-2 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Copied' : 'Copy link'}
        </button>

        {hint ? (
          <p className="mt-3 font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ShareButton({
  label,
  color,
  icon,
  href,
  onClick,
}: {
  label: string;
  color: 'acid' | 'blood' | 'mustard' | 'fg';
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const colorClass: Record<typeof color, string> = {
    acid: 'border-acid text-acid hover:bg-acid hover:text-bg',
    blood: 'border-blood text-blood hover:bg-blood hover:text-bg',
    mustard: 'border-mustard text-mustard hover:bg-mustard hover:text-bg',
    fg: 'border-fg text-fg hover:bg-fg hover:text-bg',
  };
  const className = cn(
    'flex flex-col items-center gap-1.5 border-2 py-3 transition-colors',
    colorClass[color],
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
        {icon}
        <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
    </button>
  );
}

interface RoundViewProps {
  round: RoomRound;
  quickMode: boolean;
  isPrompter: boolean;
  myVote: 'truth' | 'cap' | null | undefined;
  votes: RoundVote[];
  players: RoomPlayer[];
  eligibleVoters: number;
  onDeclare: (answer: 'truth' | 'cap') => void;
  onVote: (vote: 'truth' | 'cap') => void;
  onReveal: () => void;
  iAmHost: boolean;
  allVoted: boolean;
}

function RoundView({
  round,
  quickMode,
  isPrompter,
  myVote,
  votes,
  players,
  eligibleVoters,
  onDeclare,
  onVote,
  onReveal,
  iAmHost,
  allVoted,
}: RoundViewProps) {
  const revealed = !!round.revealed_at;
  const truthVotes = votes.filter(v => v.vote === 'truth').length;
  const capVotes = votes.filter(v => v.vote === 'cap').length;
  const prompter = round.prompter_player_id
    ? players.find(p => p.id === round.prompter_player_id)
    : null;

  // Voting opens once the prompter has declared (classic) or immediately (quick).
  const votingOpen = quickMode || !!round.declared_answer;
  const waitingForDeclare = !quickMode && !round.declared_answer && !revealed;

  return (
    <section className="mt-6 border-2 border-fg p-5 bg-bg-card">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
        Round {round.round_number}
        {round.is_custom ? ' · host wrote this' : ''}
        {quickMode ? ' · quick' : ''}
      </p>

      {prompter ? (
        <p className="font-mono text-[10px] tracking-widest uppercase text-blood mb-2">
          On the spot: <span className="text-fg">{prompter.display_name}</span>
        </p>
      ) : null}

      <p className="font-display text-2xl font-black leading-tight mb-3">
        &ldquo;{round.question}&rdquo;
      </p>

      {/* Prompter's declaration UI (classic mode only). */}
      {!quickMode && isPrompter && !round.declared_answer && !revealed ? (
        <div className="mt-5 space-y-3">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
            Your call: truth or cap?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onDeclare('truth')}
              className="border-2 border-acid text-acid hover:bg-acid hover:text-bg py-4 font-display font-black text-lg uppercase tracking-tight transition-colors"
              type="button"
            >
              Truth
            </button>
            <button
              onClick={() => onDeclare('cap')}
              className="border-2 border-blood text-blood hover:bg-blood hover:text-bg py-4 font-display font-black text-lg uppercase tracking-tight transition-colors"
              type="button"
            >
              Cap
            </button>
          </div>
          <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted">
            Friends vote next. Pick whatever you want — bluffing is the point.
          </p>
        </div>
      ) : null}

      {waitingForDeclare && !isPrompter ? (
        <p className="mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          Waiting for {prompter?.display_name ?? 'them'} to call truth or cap…
        </p>
      ) : null}

      {/* Voting UI. */}
      {votingOpen && !revealed && !isPrompter ? (
        <div className="mt-5">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
            {quickMode ? 'Truth or cap?' : `${prompter?.display_name ?? 'They'} called ${round.declared_answer?.toUpperCase()}. Buy it?`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onVote('truth')}
              disabled={myVote != null}
              className={cn(
                'border-2 py-4 font-display font-black text-lg uppercase tracking-tight transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                myVote === 'truth'
                  ? 'border-acid bg-acid text-bg'
                  : 'border-line text-fg hover:border-acid hover:text-acid'
              )}
              type="button"
            >
              Truth
            </button>
            <button
              onClick={() => onVote('cap')}
              disabled={myVote != null}
              className={cn(
                'border-2 py-4 font-display font-black text-lg uppercase tracking-tight transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                myVote === 'cap'
                  ? 'border-blood bg-blood text-fg'
                  : 'border-line text-fg hover:border-blood hover:text-blood'
              )}
              type="button"
            >
              Cap
            </button>
          </div>
          <p className="font-mono text-[9px] tracking-widest uppercase text-fg-muted text-center mt-3">
            {votes.length}/{eligibleVoters} voted
          </p>
        </div>
      ) : null}

      {votingOpen && !revealed && isPrompter ? (
        <p className="mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          Friends are voting now…
        </p>
      ) : null}

      {iAmHost && votingOpen && !revealed && allVoted ? (
        <button
          onClick={onReveal}
          className="mt-4 w-full border-2 border-mustard bg-mustard text-bg font-display font-black text-base uppercase tracking-tight py-3 hover:bg-bg hover:text-mustard transition-colors"
          type="button"
        >
          Reveal results
        </button>
      ) : null}

      {revealed ? (
        <div className="mt-5">
          {round.declared_answer ? (
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
              {prompter?.display_name ?? 'Prompter'} called:{' '}
              <span
                className={
                  round.declared_answer === 'truth' ? 'text-acid' : 'text-blood'
                }
              >
                {round.declared_answer.toUpperCase()}
              </span>
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="border-2 border-acid px-3 py-3 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest uppercase text-acid inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Truth
              </span>
              <span className="font-display font-black text-2xl">{truthVotes}</span>
            </div>
            <div className="border-2 border-blood px-3 py-3 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest uppercase text-blood inline-flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Cap
              </span>
              <span className="font-display font-black text-2xl">{capVotes}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
