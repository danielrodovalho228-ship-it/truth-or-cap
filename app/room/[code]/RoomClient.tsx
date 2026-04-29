'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Crown, Users, Copy, Play, Clock } from 'lucide-react';
import type { Room, RoomPlayer, RoomRound } from '@/lib/rooms';

interface Props {
  initialRoom: Room;
  initialPlayers: RoomPlayer[];
  initialRound: RoomRound | null;
}

export function RoomClient({ initialRoom, initialPlayers, initialRound }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<RoomPlayer[]>(initialPlayers);
  const [round, setRound] = useState<RoomRound | null>(initialRound);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  // Recover this player from localStorage so the host (or returning player) is recognized.
  useEffect(() => {
    try {
      const id = window.localStorage.getItem(`tlc:player:${room.code}`);
      if (id) setMyPlayerId(id);
    } catch { /* */ }
  }, [room.code]);

  // Realtime subscriptions for players + rounds + room status.
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
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_rounds', filter: `room_id=eq.${room.id}` }, (payload) => {
        setRound((prev) => prev && prev.id === (payload.new as RoomRound).id ? (payload.new as RoomRound) : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, room.id]);

  const me = players.find(p => p.id === myPlayerId);
  const host = players.find(p => p.is_host);
  const iAmHost = me?.is_host ?? false;

  const startNextRound = () => {
    setError(null);
    if (!iAmHost) return;
    // Pick prompter: rotate through non-host players first, then include host.
    const sorted = [...players].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    const idx = room.current_round % sorted.length;
    const prompter = sorted[idx];
    if (!prompter) {
      setError('Need at least 1 player to start');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/room/round/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room.id, prompterPlayerId: prompter.id }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? 'Failed to start round');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start round');
      }
    });
  };

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/room/${room.code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* */ }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-violet-50 pb-32">
      <header className="px-5 pt-8 pb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-violet-700/70">
          {room.mode} · {room.spice} · round {room.current_round} of {room.max_rounds}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="font-display text-3xl font-black text-violet-900 font-mono tracking-widest">{room.code}</h1>
          <button
            onClick={copyLink}
            className="px-3 py-1.5 rounded-full bg-white border-2 border-pink-200 text-sm font-medium text-violet-700 flex items-center gap-1"
            type="button"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </header>

      <section className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-violet-700" />
          <h2 className="text-sm font-bold text-violet-900">{players.length} {players.length === 1 ? 'player' : 'players'}</h2>
        </div>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 ${
                p.id === myPlayerId ? 'border-violet-500' : 'border-pink-100'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                {p.display_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-bold text-violet-900">
                  {p.display_name}
                  {p.id === myPlayerId ? <span className="text-xs text-violet-500 ml-2">(you)</span> : null}
                </div>
              </div>
              {p.is_host ? <Crown className="w-4 h-4 text-amber-500" /> : null}
            </li>
          ))}
        </ul>
      </section>

      {round ? (
        <section className="mx-5 mt-6 rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 text-white p-6 shadow-xl">
          <p className="text-xs font-mono uppercase tracking-widest opacity-80 mb-2">
            Round {round.round_number} · prompter {players.find(p => p.id === round.prompter_player_id)?.display_name ?? '...'}
          </p>
          <p className="text-2xl font-display font-black leading-tight">"{round.question}"</p>
          {round.sus_level !== null ? (
            <p className="mt-4 text-lg font-bold">SUS LEVEL: {Number(round.sus_level).toFixed(0)}%</p>
          ) : (
            <p className="mt-4 text-sm opacity-80 inline-flex items-center gap-2">
              <Clock className="w-4 h-4 animate-pulse" /> Waiting for the prompter to record...
            </p>
          )}
        </section>
      ) : null}

      {iAmHost && room.status !== 'finished' ? (
        <section className="px-5 mt-8">
          <button
            onClick={startNextRound}
            disabled={pending || players.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-white font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 shadow-xl active:scale-95 transition disabled:opacity-60"
          >
            <Play className="w-5 h-5" /> {pending ? 'Starting...' : round ? 'Start next round' : 'Start first round'}
          </button>
        </section>
      ) : null}

      {!iAmHost && host ? (
        <section className="px-5 mt-8 text-center text-sm text-violet-700/80">
          Waiting for {host.display_name} to start the round...
        </section>
      ) : null}

      {error ? (
        <p className="mx-5 mt-4 px-4 py-3 rounded-2xl bg-rose-100 text-rose-700 text-sm font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
