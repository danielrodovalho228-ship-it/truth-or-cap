'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { baselinePath, sampleEnergy } from '@/lib/voice-baseline';
import { cn } from '@/lib/utils';

const TARGET_DURATION_MS = 15_000;
const BAR_COUNT = 40;

type Status = 'idle' | 'requesting' | 'recording' | 'uploading' | 'done' | 'error';

interface VoiceCalibratorProps {
  onComplete: () => void;
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'audio/webm';
}

export function VoiceCalibrator({ onComplete }: VoiceCalibratorProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef<string>('audio/webm');

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0));

  useEffect(() => {
    return cleanup;
  }, []);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const drawWaveform = () => {
    if (!analyserRef.current) return;
    const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(buf);
    const next: number[] = [];
    const step = Math.max(1, Math.floor(buf.length / BAR_COUNT));
    for (let i = 0; i < BAR_COUNT; i++) {
      next.push(buf[i * step] / 255);
    }
    setBars(next);
    rafRef.current = requestAnimationFrame(drawWaveform);
  };

  const start = async () => {
    setErrorMsg(null);
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Waveform tap
      const Ctx: typeof AudioContext =
        // @ts-expect-error webkit prefix
        window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      // Use sampleEnergy occasionally if we ever want to gate "did they speak loud enough"
      void sampleEnergy;
      drawWaveform();

      // Recorder
      const mime = pickMime();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = handleStop;
      recorder.start(500);
      recorderRef.current = recorder;

      startedAtRef.current = Date.now();
      setStatus('recording');
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setDuration(elapsed);
        if (elapsed >= TARGET_DURATION_MS) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.error('[voice-calibrator] mic error', err);
      setErrorMsg('Mic blocked. Allow in browser settings, then retry.');
      setStatus('error');
      cleanup();
    }
  };

  const stopRecording = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handleStop = async () => {
    setStatus('uploading');
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());

    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authed');

      const path = baselinePath(auth.user.id);
      const { error: upError } = await supabase.storage
        .from('voice-baselines')
        .upload(path, blob, { contentType: mimeRef.current, upsert: false });
      if (upError) throw upError;

      const finalDuration = Date.now() - startedAtRef.current;
      const resp = await fetch('/api/voice-baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, duration_ms: Math.min(finalDuration, TARGET_DURATION_MS) }),
      });
      if (!resp.ok) throw new Error('Save failed');

      setStatus('done');
      window.setTimeout(onComplete, 700);
    } catch (err) {
      console.error('[voice-calibrator] upload', err);
      setErrorMsg('Upload failed. Try again.');
      setStatus('error');
    }
  };

  const remaining = Math.max(0, Math.ceil((TARGET_DURATION_MS - duration) / 1000));
  const progressPct = Math.min(100, (duration / TARGET_DURATION_MS) * 100);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full">
      <div className="h-32 w-full max-w-sm flex items-end justify-center gap-[2px] mb-8">
        {bars.map((v, i) => (
          <motion.div
            key={i}
            className="w-1.5 origin-bottom"
            animate={{
              height: status === 'recording' ? `${Math.max(4, v * 100)}px` : '4px',
              backgroundColor:
                status === 'done'
                  ? 'var(--acid)'
                  : status === 'recording'
                  ? 'var(--mustard)'
                  : 'var(--line)',
            }}
            transition={{ duration: 0.05 }}
          />
        ))}
      </div>

      {(status === 'idle' || status === 'error') && (
        <button
          onClick={start}
          className={cn(
            'border-2 border-fg bg-fg text-bg px-8 py-5 font-display text-2xl font-black uppercase tracking-tight',
            'hover:bg-bg hover:text-fg transition-colors',
            'inline-flex items-center gap-3'
          )}
        >
          <Mic className="w-6 h-6" />
          {status === 'error' ? 'Try again' : 'Start calibration'}
        </button>
      )}

      {status === 'requesting' && (
        <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
          Allow mic access…
        </p>
      )}

      {status === 'recording' && (
        <div className="text-center w-full max-w-xs">
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
            Recording — {remaining}s
          </div>
          <div className="w-full h-1 bg-line mb-5">
            <div className="h-full bg-mustard transition-all duration-100" style={{ width: `${progressPct}%` }} />
          </div>
          <button
            onClick={stopRecording}
            className="font-mono text-xs tracking-widest uppercase text-fg-muted hover:text-fg inline-flex items-center gap-2"
          >
            <Square className="w-3 h-3" /> Stop early
          </button>
        </div>
      )}

      {status === 'uploading' && (
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-mustard border-t-transparent rounded-full mx-auto mb-3" />
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            Saving voice signature…
          </p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center">
          <Check className="w-12 h-12 text-acid mx-auto mb-3" />
          <p className="font-display text-2xl font-black">Calibrated.</p>
        </div>
      )}

      {errorMsg ? (
        <p className="font-mono text-xs tracking-widest uppercase text-blood mt-4" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
