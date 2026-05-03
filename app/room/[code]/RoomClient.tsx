'use client';

import { useEffect, useState, useTransition, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Crown, Users, Copy, Play, Clock, Mic, Square, CheckCircle2, XCircle } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  useEffect(() => {
    try {
      const id = window.localStorage.getItem(`tlc:player:${room.code}`);
      if (id) setMyPlayerId(id);
    } catch { /* */ }
  }, [room.code]);

  // Realtime: rooms, room_players, room_rounds, round_votes.
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

  // round_votes channel is scoped to the active round.id — re-subscribes
  // whenever round changes so we never see votes from sibling rooms.
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
  const iAmPrompter = round && me && round.prompter_player_id === me.id;
  const myVote = round ? votes.find(v => v.voter_player_id === myPlayerId)?.vote : null;
  const eligibleVoters = players.filter(p => p.id !== round?.prompter_player_id);
  const allVoted = round && eligibleVoters.length > 0 && votes.length >= eligibleVoters.length;

  const startNextRound = () => {
    setError(null);
    if (!iAmHost) return;
    const sorted = [...players].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    const idx = room.current_round % sorted.length;
    const prompter = sorted[idx];
    if (!prompter) return setError('Need at least 1 player');
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

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/room/${room.code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* */ }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full pb-24">
        <Link
          href="/online"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block"
        >
          ← lobby
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          {room.mode} · {room.spice} · round {room.current_round} of {room.max_rounds}
        </p>
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="font-display text-5xl font-black leading-[0.9] tracking-[0.1em]">
            {room.code}
          </h1>
          <button
            onClick={copyLink}
            className="border-2 border-line hover:border-fg px-3 py-2 font-mono text-[10px] tracking-widest uppercase text-fg flex items-center gap-1.5 transition-colors"
            type="button"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-fg-muted" />
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
              {players.length}/{room.max_players ?? 10} players
            </p>
          </div>
          <ul className="space-y-2">
            {players.map((p) => {
              const playerVote = votes.find(v => v.voter_player_id === p.id);
              const isMe = p.id === myPlayerId;
              return (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 border-2 px-4 py-3 transition-colors',
                    isMe ? 'border-fg' : 'border-line'
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
                    {round && p.id === round.prompter_player_id ? (
                      <p className="font-mono text-[9px] tracking-widest uppercase text-blood mt-0.5">
                        prompter
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

        {round ? (
          <RoundView
            round={round}
            isPrompter={!!iAmPrompter}
            myPlayerId={me?.id ?? null}
            myVote={myVote}
            votes={votes}
            eligibleVoters={eligibleVoters.length}
            onVote={castVote}
            onReveal={reveal}
            iAmHost={iAmHost}
            allVoted={!!allVoted}
          />
        ) : null}

        {iAmHost && room.status !== 'finished' ? (
          <section className="mt-6">
            <Button
              onClick={startNextRound}
              disabled={pending || players.length === 0}
              size="lg"
              fullWidth
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                {pending
                  ? 'Starting…'
                  : round?.revealed_at || !round
                  ? 'Start next round'
                  : 'Round in progress…'}
              </span>
            </Button>
          </section>
        ) : null}

        {!iAmHost && host && !round ? (
          <p className="mt-6 font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted text-center">
            Waiting for {host.display_name} to start the round…
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
    </main>
  );
}

interface RoundViewProps {
  round: RoomRound;
  isPrompter: boolean;
  myPlayerId: string | null;
  myVote: 'truth' | 'cap' | null | undefined;
  votes: RoundVote[];
  eligibleVoters: number;
  onVote: (vote: 'truth' | 'cap') => void;
  onReveal: () => void;
  iAmHost: boolean;
  allVoted: boolean;
}

function RoundView({ round, isPrompter, myPlayerId, myVote, votes, eligibleVoters, onVote, onReveal, iAmHost, allVoted }: RoundViewProps) {
  const revealed = !!round.revealed_at;
  const truthVotes = votes.filter(v => v.vote === 'truth').length;
  const capVotes = votes.filter(v => v.vote === 'cap').length;

  return (
    <section className="mt-6 border-2 border-fg p-5 bg-bg-card">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        Round {round.round_number}
      </p>
      <p className="font-display text-2xl font-black leading-tight mb-1">
        &ldquo;{round.question}&rdquo;
      </p>

      {isPrompter && !round.recording_url ? (
        <PrompterRecorder roundId={round.id} playerId={myPlayerId} />
      ) : null}

      {round.recording_url && round.sus_level === null ? (
        <p className="mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted inline-flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 animate-pulse" /> Analyzing voice + face + language…
        </p>
      ) : null}

      {round.sus_level !== null && !revealed && !isPrompter ? (
        <div className="mt-5">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
            Cast your vote
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

      {round.sus_level !== null && !revealed && isPrompter ? (
        <p className="mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          Recording analyzed. Friends are voting now…
        </p>
      ) : null}

      {iAmHost && round.sus_level !== null && !revealed && allVoted ? (
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
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">SUS LEVEL</p>
          <p className="font-display text-6xl font-black leading-none mt-1 text-mustard">
            {Number(round.sus_level ?? 0).toFixed(0)}%
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-2">
            Player declared:{' '}
            <span className="text-fg">{round.declared_answer?.toUpperCase() ?? '—'}</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
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
          {round.analysis_summary ? (
            <p className="mt-3 font-mono text-[10px] tracking-widest text-fg-muted leading-relaxed">
              {round.analysis_summary}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PrompterRecorder({ roundId, playerId }: { roundId: string; playerId: string | null }) {
  const [recording, setRecording] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [declaredAnswer, setDeclaredAnswer] = useState<'truth' | 'cap'>('truth');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      chunksRef.current = [];
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
      ];
      const supported = candidates.find((m) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) || '';
      const mimeType = supported || candidates[0];
      const mr = new MediaRecorder(stream, supported ? { mimeType } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => {
        if (s >= 30) { stop(); return 30; }
        return s + 1;
      }), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mic/camera blocked');
    }
  };

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const handleStop = async () => {
    const recordedMime = mediaRecorderRef.current?.mimeType || 'video/webm';
    const isMp4 = recordedMime.includes('mp4');
    const blob = new Blob(chunksRef.current, { type: recordedMime });
    const ext = isMp4 ? 'mp4' : 'webm';
    const path = `rooms/${roundId}-${Date.now()}.${ext}`;
    try {
      const initRes = await fetch('/api/recording/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType: recordedMime }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error ?? 'Init failed');

      const put = await fetch(init.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': recordedMime },
        body: blob,
      });
      if (!put.ok) throw new Error('Upload failed');

      const upRes = await fetch('/api/room/round/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send playerId so anonymous prompters can prove identity to the
        // server (authed users are matched via their session.user_id).
        body: JSON.stringify({ roundId, playerId, recordingUrl: path, declaredAnswer }),
      });
      const up = await upRes.json();
      if (!upRes.ok) throw new Error(up.error ?? 'Upload metadata failed');

      setUploaded(true);
      setAnalyzing(true);
      // Trigger analysis (server runs whisper/hume/claude pipeline).
      const aRes = await fetch('/api/room/round/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      if (!aRes.ok) {
        const a = await aRes.json();
        throw new Error(a.error ?? 'Analyze failed');
      }
      setAnalyzing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setAnalyzing(false);
    }
  };

  if (uploaded) {
    return (
      <p className="mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted">
        {analyzing ? 'Analyzing your recording…' : 'Recording uploaded, waiting for friends to vote.'}
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {!recording ? (
        <>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted">
            Your truth or your lie
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDeclaredAnswer('truth')}
              className={cn(
                'border-2 py-3 font-display font-black uppercase tracking-tight transition-colors',
                declaredAnswer === 'truth'
                  ? 'border-acid bg-acid text-bg'
                  : 'border-line text-fg hover:border-acid hover:text-acid'
              )}
              type="button"
            >
              Truth
            </button>
            <button
              onClick={() => setDeclaredAnswer('cap')}
              className={cn(
                'border-2 py-3 font-display font-black uppercase tracking-tight transition-colors',
                declaredAnswer === 'cap'
                  ? 'border-blood bg-blood text-fg'
                  : 'border-line text-fg hover:border-blood hover:text-blood'
              )}
              type="button"
            >
              Cap
            </button>
          </div>
          <button
            onClick={start}
            className="w-full border-2 border-mustard bg-mustard text-bg font-display font-black text-base uppercase tracking-tight py-3 inline-flex items-center justify-center gap-2 hover:bg-bg hover:text-mustard transition-colors"
            type="button"
          >
            <Mic className="w-4 h-4" /> Tap to record (30s)
          </button>
        </>
      ) : (
        <>
          <video ref={videoRef} autoPlay muted playsInline className="w-full border-2 border-line bg-black aspect-video" />
          <p className="text-center font-mono text-2xl text-mustard">{30 - seconds}s</p>
          <button
            onClick={stop}
            className="w-full border-2 border-blood bg-blood text-fg font-display font-black text-base uppercase tracking-tight py-3 inline-flex items-center justify-center gap-2 hover:bg-bg hover:text-blood transition-colors"
            type="button"
          >
            <Square className="w-4 h-4" /> Stop
          </button>
        </>
      )}
      {error ? (
        <p className="font-mono text-[10px] tracking-widest uppercase text-blood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
