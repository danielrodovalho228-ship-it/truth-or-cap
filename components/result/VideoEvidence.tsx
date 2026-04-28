'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoEvidenceProps {
  gameId: string;
  onPlayed?: () => void;
}

/**
 * Resolves a signed URL for the private recording via /api/recording/url
 * (server-side; uses service role + RLS-aware authorization). Renders the
 * video with native controls.
 */
export function VideoEvidence({ gameId, onPlayed }: VideoEvidenceProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch('/api/recording/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId }),
        });
        if (cancelled) return;
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          setError(body.error ?? 'Could not load video');
          return;
        }
        const json = (await resp.json()) as { url?: string };
        if (!json.url) {
          setError('No URL returned');
          return;
        }
        setUrl(json.url);
      } catch (err) {
        if (cancelled) return;
        console.error('[VideoEvidence] fetch failed', err);
        setError('Network error loading video');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return (
    <div className="relative bg-black border-2 border-line overflow-hidden">
      <div className="ruler-marks absolute inset-0 opacity-10 pointer-events-none" />
      {url ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[60vh] object-contain bg-black"
          onPlay={() => {
            if (!playedRef.current) {
              playedRef.current = true;
              onPlayed?.();
            }
          }}
        />
      ) : (
        <div className="aspect-[9/16] max-h-[60vh] flex items-center justify-center">
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center px-4">
            {error ? error : 'Loading evidence…'}
          </p>
        </div>
      )}
    </div>
  );
}
