'use client';

import { useEffect, useState, useTransition, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Crown, Users, Copy, Play, Clock, Mic, Square, CheckCircle2, XCircle } from 'lucide-react';
import type { Room, RoomPlayer, RoomRound, RoundVote } from '@/lib/rooms';

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'round_votes' }, (payload) => {
        const v = payload.new as RoundVote;
        // Compare against latest round via state setter (avoid stale closure).
        setVotes((prev) => {
          // We don't know the round id here without state; let downstream filter.
          if (prev.some(x => x.id === v.id)) return prev;
          return [...prev, v];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, room.id]);

  // When a round becomes active, fetch its existing votes (in case we joined late).
  useEffect(() => {
    if (!round) { setVotes([]); return; }
    let cancelled = false;
    supabase.from('round_votes').select('*').eq('round_id', round.id).then(({ data }) => {
      if (!cancelled && data) setVotes(data);
    });
    return () => { cancelled = true; };
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
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-violet-50 pb-32">
      <header className="px-5 pt-8 pb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-violet-700/70">
          {room.mode} · {room.spice} · round {room.current_round} of {room.max_rounds}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="font-display text-3xl font-black text-violet-900 font-mono tracking-widest">{room.code}</h1>
          <button onClick={copyLink} className="px-3 py-1.5 rounded-full bg-white border-2 border-pink-200 text-sm font-medium text-violet-700 flex items-center gap-1" type="button">
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </header>

      <section className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-violet-700" />
          <h2 className="text-sm font-bold text-violet-900">{players.length}/{room.max_players ?? 10} players</h2>
        </div>
        <ul className="space-y-2">
          {players.map((p) => {
            const playerVote = votes.find(v => v.voter_player_id === p.id);
            return (
              <li key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 ${p.id === myPlayerId ? 'border-violet-500' : 'border-pink-100'}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                  {p.display_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-violet-900">
                    {p.display_name}
                    {p.id === myPlayerId ? <span className="text-xs text-violet-500 ml-2">(you)</span> : null}
                    {round && p.id === round.prompter_player_id ? <span className="text-xs text-rose-500 ml-2">prompter</span> : null}
                  </div>
                </div>
                {p.is_host ? <Crown className="w-4 h-4 text-amber-500" /> : null}
                {round && playerVote && !round.revealed_at ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : null}
              </li>
            );
          })}
        </ul>
      </section>

      {round ? (
        <RoundView
          round={round}
          isPrompter={!!iAmPrompter}
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
        <section className="px-5 mt-8">
          <button
            onClick={startNextRound}
            disabled={pending || players.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-white font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 shadow-xl active:scale-95 transition disabled:opacity-60"
          >
            <Play className="w-5 h-5" /> {pending ? 'Starting...' : round?.revealed_at || !round ? 'Start next round' : 'Round in progress...'}
          </button>
        </section>
      ) : null}

      {!iAmHost && host && !round ? (
        <section className="px-5 mt-8 text-center text-sm text-violet-700/80">
          Waiting for {host.display_name} to start the round...
        </section>
      ) : null}

      {error ? (
        <p className="mx-5 mt-4 px-4 py-3 rounded-2xl bg-rose-100 text-rose-700 text-sm font-medium" role="alert">{error}</p>
      ) : null}
    </main>
  );
}

interface RoundViewProps {
  round: RoomRound;
  isPrompter: boolean;
  myVote: 'truth' | 'cap' | null | undefined;
  votes: RoundVote[];
  eligibleVoters: number;
  onVote: (vote: 'truth' | 'cap') => void;
  onReveal: () => void;
  iAmHost: boolean;
  allVoted: boolean;
}

function RoundView({ round, isPrompter, myVote, votes, eligibleVoters, onVote, onReveal, iAmHost, allVoted }: RoundViewProps) {
  const revealed = !!round.revealed_at;
  const truthVotes = votes.filter(v => v.vote === 'truth').length;
  const capVotes = votes.filter(v => v.vote === 'cap').length;

  return (
    <section className="mx-5 mt-6 rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 text-white p-6 shadow-xl">
      <p className="text-xs font-mono uppercase tracking-widest opacity-80 mb-2">
        Round {round.round_number}
      </p>
      <p className="text-2xl font-display font-black leading-tight">"{round.question}"</p>

      {isPrompter && !round.recording_url ? (
        <PrompterRecorder roundId={round.id} />
      ) : null}

      {round.recording_url && round.sus_level === null ? (
        <p className="mt-4 text-sm opacity-90 inline-flex items-center gap-2">
          <Clock className="w-4 h-4 animate-pulse" /> Analyzing voice + face + language...
        </p>
      ) : null}

      {round.sus_level !== null && !revealed && !isPrompter ? (
        <div className="mt-5">
          <p className="text-xs font-mono uppercase tracking-widest opacity-80 mb-3">Cast your vote</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onVote('truth')}
              disabled={myVote != null}
              className={`rounded-2xl py-4 font-black text-lg ${myVote === 'truth' ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20 hover:bg-white/30 text-white'} disabled:opacity-60`}
              type="button"
            >
              TRUTH
            </button>
            <button
              onClick={() => onVote('cap')}
              disabled={myVote != null}
              className={`rounded-2xl py-4 font-black text-lg ${myVote === 'cap' ? 'bg-rose-400 text-rose-950' : 'bg-white/20 hover:bg-white/30 text-white'} disabled:opacity-60`}
              type="button"
            >
              CAP
            </button>
          </div>
          <p className="text-xs opacity-70 mt-3 text-center">{votes.length}/{eligibleVoters} voted</p>
        </div>
      ) : null}

      {round.sus_level !== null && !revealed && isPrompter ? (
        <p className="mt-4 text-sm opacity-90">Recording analyzed. Friends are voting now...</p>
      ) : null}

      {iAmHost && round.sus_level !== null && !revealed && allVoted ? (
        <button onClick={onReveal} className="mt-4 w-full bg-amber-300 text-amber-950 font-black rounded-2xl py-3" type="button">
          Reveal results
        </button>
      ) : null}

      {revealed ? (
        <div className="mt-5">
          <p className="text-xs font-mono uppercase tracking-widest opacity-80">SUS LEVEL</p>
          <p className="text-6xl font-display font-black mt-1">{Number(round.sus_level ?? 0).toFixed(0)}%</p>
          <p className="text-sm opacity-90 mt-2">Player declared: {round.declared_answer?.toUpperCase() ?? '—'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-400/20 px-4 py-3 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> TRUTH</span>
              <span className="text-2xl font-black">{truthVotes}</span>
            </div>
            <div className="rounded-2xl bg-rose-400/20 px-4 py-3 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> CAP</span>
              <span className="text-2xl font-black">{capVotes}</span>
            </div>
          </div>
          {round.analysis_summary ? (
            <p className="mt-3 text-xs opacity-80 font-mono">{round.analysis_summary}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PrompterRecorder({ roundId }: { roundId: string }) {
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
        body: JSON.stringify({ roundId, recordingUrl: path, declaredAnswer }),
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
      <p className="mt-4 text-sm opacity-90">
        {analyzing ? '⏳ Analyzing your recording...' : '✅ Recording uploaded, waiting for friends to vote.'}
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {!recording ? (
        <>
          <p className="text-xs font-mono uppercase tracking-widest opacity-80">Your truth or your lie</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setDeclaredAnswer('truth')} className={`rounded-2xl py-3 font-black ${declaredAnswer === 'truth' ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20'}`} type="button">TRUTH</button>
            <button onClick={() => setDeclaredAnswer('cap')} className={`rounded-2xl py-3 font-black ${declaredAnswer === 'cap' ? 'bg-rose-400 text-rose-950' : 'bg-white/20'}`} type="button">CAP</button>
          </div>
          <button onClick={start} className="w-full bg-amber-300 text-amber-950 font-black rounded-2xl py-3 flex items-center justify-center gap-2" type="button">
            <Mic className="w-4 h-4" /> Tap to record (30s)
          </button>
        </>
      ) : (
        <>
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-2xl bg-black aspect-video" />
          <p className="text-center font-mono text-2xl">{30 - seconds}s</p>
          <button onClick={stop} className="w-full bg-rose-400 text-rose-950 font-black rounded-2xl py-3 flex items-center justify-center gap-2" type="button">
            <Square className="w-4 h-4" /> Stop
          </button>
        </>
      )}
      {error ? <p className="text-rose-200 text-xs" role="alert">{error}</p> : null}
    </div>
  );
}
