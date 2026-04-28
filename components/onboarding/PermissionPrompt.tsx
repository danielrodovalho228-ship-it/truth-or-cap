'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type State = 'idle' | 'requesting' | 'granted' | 'partial' | 'denied';

export function PermissionPrompt() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [detail, setDetail] = useState<string | null>(null);

  const request = async () => {
    setState('requesting');
    setDetail(null);
    try {
      // Request both — if user grants only one, we still proceed with a warning.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      // Stop immediately — recorder will request fresh streams when needed.
      stream.getTracks().forEach((t) => t.stop());

      if (hasVideo && hasAudio) {
        setState('granted');
        window.setTimeout(() => router.push('/onboarding/friends'), 600);
      } else {
        setState('partial');
        setDetail(
          hasVideo
            ? 'Mic missing — needed for AI detection.'
            : hasAudio
            ? 'Camera missing — needed for video recording.'
            : 'Stream incomplete.'
        );
      }
    } catch {
      setState('denied');
      setDetail('You can grant later in browser settings → Site permissions.');
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      <ul className="space-y-3">
        <li className="border-2 border-line p-4 flex items-start gap-3">
          <Camera className="w-5 h-5 text-fg-muted flex-shrink-0 mt-1" />
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-1">
              Camera
            </p>
            <p className="font-body text-sm">To record your video answers (vertical, 30 sec).</p>
          </div>
        </li>
        <li className="border-2 border-line p-4 flex items-start gap-3">
          <Mic className="w-5 h-5 text-fg-muted flex-shrink-0 mt-1" />
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-1">
              Microphone
            </p>
            <p className="font-body text-sm">So the AI analyzes voice tension.</p>
          </div>
        </li>
      </ul>

      {state === 'idle' && (
        <Button onClick={request} size="xl" fullWidth className="mt-auto">
          Grant permissions
        </Button>
      )}

      {state === 'requesting' && (
        <div className="text-center py-6 mt-auto">
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            Approve in the browser prompt…
          </p>
        </div>
      )}

      {state === 'granted' && (
        <div className="text-center py-6 mt-auto">
          <Check className="w-10 h-10 text-acid mx-auto mb-2" />
          <p className="font-display text-xl font-black">Granted.</p>
        </div>
      )}

      {(state === 'partial' || state === 'denied') && (
        <div className="mt-auto space-y-3">
          <div className="border-2 border-blood p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blood flex-shrink-0 mt-1" />
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-blood mb-1">
                {state === 'partial' ? 'Partial access' : 'Blocked'}
              </p>
              <p className="font-body text-sm">{detail}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={request} variant="secondary" size="md" fullWidth>
              Try again
            </Button>
            <Button
              onClick={() => router.push('/onboarding/friends')}
              variant="ghost"
              size="md"
              fullWidth
            >
              Skip for now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
