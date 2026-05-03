'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Square, RotateCcw, Send, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConsentDisclaimer } from './ConsentDisclaimer';
import { cn } from '@/lib/utils';
import type { RecordingState, Vote } from '@/lib/types';

interface VideoRecorderProps {
  question: string;
  declaredAnswer: Vote;
  maxDurationMs?: number;
  minDurationMs?: number;
}

const DEFAULT_MAX_MS = 30_000;
const DEFAULT_MIN_MS = 3_000;

const MIME_PREFERENCES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4', // iOS Safari
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of MIME_PREFERENCES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function VideoRecorder({
  question,
  declaredAnswer,
  maxDurationMs = DEFAULT_MAX_MS,
  minDurationMs = DEFAULT_MIN_MS,
}: VideoRecorderProps) {
  const router = useRouter();

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef<string>('video/webm');

  const [state, setState] = useState<RecordingState>({ status: 'idle', duration: 0 });
  const [showConsent, setShowConsent] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const requestPermissions = useCallback(async () => {
    setState({ status: 'requesting', duration: 0 });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48_000 },
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
      setState({ status: 'ready', duration: 0 });
    } catch (err) {
      console.error('[recorder] getUserMedia failed:', err);
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera/mic blocked. Allow access in browser settings, then retry.'
          : 'Could not access camera. Try another browser or device.';
      setState({ status: 'error', duration: 0, error: message });
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mime = pickMimeType();
    mimeRef.current = mime || 'video/webm';

    const recorder = new MediaRecorder(streamRef.current, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 128_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      // Use the recorded duration (clamped to max).
      setState((prev) => ({ ...prev, status: 'processing' }));
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setState({ status: 'recording', duration: 0 });

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setState((s) => ({ ...s, duration: elapsed }));
      if (elapsed >= maxDurationMs) stopRecording();
    }, 100);
  }, [maxDurationMs]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const retake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    chunksRef.current = [];
    setState({ status: 'ready', duration: 0 });
  }, [previewUrl]);

  const submit = useCallback(async () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    const duration = state.duration;

    if (duration < minDurationMs) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: `Recording too short. Minimum ${Math.ceil(minDurationMs / 1000)}s.`,
      }));
      return;
    }

    // Hard server-side limit is 25MB. Bail early so we don't waste an upload.
    if (blob.size > 25_000_000) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: 'Recording is over 25MB. Try a shorter take.',
      }));
      return;
    }

    setState((s) => ({ ...s, status: 'uploading' }));
    try {
      // 1. Init: create game row + signed upload URL
      const initResp = await fetch('/api/recording/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          declaredAnswer,
          durationMs: Math.min(duration, maxDurationMs),
          mimeType: blob.type || mimeRef.current,
        }),
      });
      if (!initResp.ok) {
        const err = await initResp.json().catch(() => ({}));
        throw new Error(err.error ?? 'Init failed');
      }
      const { gameId, signedUrl } = (await initResp.json()) as { gameId: string; signedUrl: string };

      // 2. Direct upload — strip ";codecs=..." since Supabase Storage's
      // allowed_mime_types matches the bare MIME exactly.
      const rawMime = blob.type || mimeRef.current;
      const bareMime = rawMime.split(';')[0].trim() || 'video/webm';

      const upResp = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': bareMime, 'x-upsert': 'true' },
        body: blob,
      });
      if (!upResp.ok) {
        const errText = await upResp.text().catch(() => '');
        console.error('[recorder] upload failed:', upResp.status, errText);
        throw new Error(
          `Upload rejected (${upResp.status}). ${errText.slice(0, 120) || 'Check console for details.'}`
        );
      }

      // 3. Trigger analysis & navigate to processing screen.
      // Processing page polls for the analysis row, so we can fire-and-forget here.
      void fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      // Stop the live stream — we're navigating away.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      router.push(`/jogo/${gameId}/processing`);
    } catch (err) {
      console.error('[recorder] submit failed:', err);
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something broke during upload.',
      }));
    }
  }, [question, declaredAnswer, state.duration, minDurationMs, maxDurationMs, router]);

  // Render guards
  if (showConsent) {
    return (
      <ConsentDisclaimer
        onAccept={() => {
          setShowConsent(false);
          void requestPermissions();
        }}
        onCancel={() => router.back()}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-blood mb-4" />
        <p className="font-display text-2xl font-black mb-2">Hold up.</p>
        <p className="font-body text-sm text-fg-muted mb-6 leading-relaxed">{state.error}</p>
        <Button onClick={requestPermissions} size="lg">
          Try again
        </Button>
        <button
          onClick={() => router.back()}
          className="mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state.status === 'requesting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <Loader2 className="w-10 h-10 text-mustard animate-spin mb-4" />
        <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
          Allow camera & mic in the browser prompt…
        </p>
      </div>
    );
  }

  const progress = Math.min(100, (state.duration / maxDurationMs) * 100);
  const secondsLeft = Math.max(0, Math.ceil((maxDurationMs - state.duration) / 1000));
  const isPreview = state.status === 'processing' && previewUrl !== null;
  const isWorking = state.status === 'uploading' || state.status === 'analyzing';

  // PREVIEW MODE — clean two-row layout. Video on top with native controls
  // visible; action buttons in a separate bar below so they never overlap
  // with playback controls. User can hit play to hear their recording.
  if (isPreview) {
    return (
      <div className="min-h-[100svh] bg-bg flex flex-col">
        <div className="px-5 pt-5 pb-3 max-w-md mx-auto w-full">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-1">
            Preview · check before sending
          </p>
          <p className="font-display text-base md:text-lg leading-snug text-fg-muted max-w-md">
            &ldquo;{question}&rdquo;
          </p>
        </div>

        <div className="flex-1 bg-black flex items-center justify-center px-0 max-h-[65vh]">
          <video
            ref={previewVideoRef}
            src={previewUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[65vh] object-contain bg-black"
          />
        </div>

        <div className="px-5 pt-4 pb-6 max-w-md mx-auto w-full space-y-3">
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center">
            Tap ▶ to hear it. Bad take? Retake. Good? Send it.
          </p>
          <div className="flex gap-3">
            <Button onClick={retake} variant="ghost" size="lg" fullWidth>
              <span className="inline-flex items-center gap-2 justify-center">
                <RotateCcw className="w-5 h-5" /> Retake
              </span>
            </Button>
            <Button onClick={submit} size="lg" fullWidth>
              <span className="inline-flex items-center gap-2 justify-center">
                <Send className="w-5 h-5" /> Send it
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // LIVE / READY / RECORDING / WORKING — full-screen video with overlays.
  return (
    <div className="relative min-h-[100svh] bg-bg flex flex-col">
      {/* Question header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-5 pb-8 bg-gradient-to-b from-bg/95 via-bg/70 to-transparent">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-1">
          They claim:{' '}
          <span className={declaredAnswer === 'truth' ? 'text-acid' : 'text-blood'}>
            {declaredAnswer.toUpperCase()}
          </span>
        </p>
        <p className="font-display text-xl md:text-2xl font-black leading-tight text-fg max-w-md">
          {question}
        </p>
      </div>

      {/* Recording indicator */}
      {state.status === 'recording' && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-blood px-3 py-1 border-2 border-blood">
          <span className="w-2 h-2 bg-fg rounded-full animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-fg">REC · {secondsLeft}s</span>
        </div>
      )}

      {/* Progress bar */}
      {state.status === 'recording' && (
        <div className="absolute top-44 left-5 right-5 z-20 h-[2px] bg-line">
          <div className="h-full bg-mustard transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Video stage — live preview only */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={liveVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      </div>

      {/* Bottom controls — only used during live/recording/working modes */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-6 pt-10 bg-gradient-to-t from-bg/95 via-bg/70 to-transparent">
        {state.status === 'ready' && (
          <Button onClick={startRecording} size="xl" fullWidth>
            <span className="inline-flex items-center gap-2 justify-center">
              <Video className="w-5 h-5" /> Start recording
            </span>
          </Button>
        )}

        {state.status === 'recording' && (
          <Button onClick={stopRecording} variant="secondary" size="xl" fullWidth>
            <span className="inline-flex items-center gap-2 justify-center">
              <Square className="w-5 h-5" /> Stop ({secondsLeft}s left)
            </span>
          </Button>
        )}

        {isWorking && (
          <div className="flex flex-col items-center text-center text-fg">
            <Loader2 className={cn('w-8 h-8 text-mustard animate-spin mb-2')} />
            <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
              {state.status === 'uploading' ? 'Uploading recording…' : 'Routing to analysis…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
