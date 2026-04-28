'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, Dice5, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { generatedAvatarSet, compressAvatar, type AvatarStyle } from '@/lib/avatar';

interface AvatarPickerProps {
  initialUrl: string | null;
  username: string;
}

type Mode = 'choose' | 'camera' | 'preview';

export function AvatarPicker({ initialUrl, username }: AvatarPickerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('choose');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [seedSalt, setSeedSalt] = useState(0);
  const [chosenGenerated, setChosenGenerated] = useState<{ style: AvatarStyle; url: string } | null>(null);

  // Cleanup live camera stream
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const generated = generatedAvatarSet(`${username || 'truthorcap'}_${seedSalt}`);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode('camera');
      // Wait a tick for the <video> to mount
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError('Camera blocked. Pick a generated one or try later.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const snap = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    const canvas = new OffscreenCanvas(512, 512);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, 512, 512);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    setPreviewBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    setChosenGenerated(null);
    stopCamera();
    setMode('preview');
  };

  const onUpload = async (file: File) => {
    try {
      const blob = await compressAvatar(file);
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setChosenGenerated(null);
      setMode('preview');
    } catch {
      setError('Could not read that image');
    }
  };

  const pickGenerated = (avatar: { style: AvatarStyle; url: string }) => {
    setChosenGenerated(avatar);
    setPreviewBlob(null);
    setPreviewUrl(avatar.url);
    setMode('preview');
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push('/auth/sign-in?next=/onboarding/avatar');
        return;
      }

      let finalUrl: string;

      if (chosenGenerated) {
        finalUrl = chosenGenerated.url;
      } else if (previewBlob) {
        const path = `${auth.user.id}/avatar-${Date.now()}.jpg`;
        const { error: upError } = await supabase.storage
          .from('avatars')
          .upload(path, previewBlob, { contentType: 'image/jpeg', upsert: true });
        if (upError) {
          setError('Upload failed. Try a generated one.');
          return;
        }
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        finalUrl = pub.publicUrl;
      } else {
        // No change — proceed
        router.push('/onboarding/voice');
        return;
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: finalUrl })
        .eq('id', auth.user.id);
      if (dbError) {
        setError('Could not save avatar. Try again.');
        return;
      }
      router.push('/onboarding/voice');
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {mode === 'choose' && (
        <>
          <div className="flex flex-col gap-3 mb-6">
            <Button onClick={startCamera} size="lg" fullWidth>
              <span className="inline-flex items-center gap-2 justify-center">
                <Camera className="w-5 h-5" /> Take selfie
              </span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              size="lg"
              fullWidth
            >
              Upload photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </div>

          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-3">
            Or pick a generated one
          </p>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {generated.map((a) => (
              <button
                key={a.style}
                onClick={() => pickGenerated(a)}
                className="aspect-square border-2 border-line hover:border-fg transition-colors overflow-hidden"
                aria-label={`Pick ${a.style} avatar`}
              >
                <Image
                  src={a.url}
                  alt=""
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => setSeedSalt((n) => n + 1)}
            className="self-center font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg inline-flex items-center gap-2 mt-2"
          >
            <Dice5 className="w-3 h-3" /> Reroll
          </button>
        </>
      )}

      {mode === 'camera' && (
        <div className="flex flex-col items-center">
          <div className="relative w-64 h-64 mb-4 border-2 border-fg overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => {
                stopCamera();
                setMode('choose');
              }}
              variant="ghost"
              size="md"
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={snap} size="md" fullWidth>
              Snap
            </Button>
          </div>
        </div>
      )}

      {mode === 'preview' && previewUrl && (
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 mb-6 border-2 border-acid overflow-hidden bg-bg-card flex items-center justify-center">
            <Image
              src={previewUrl}
              alt="Your avatar"
              width={192}
              height={192}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-acid mb-4 inline-flex items-center gap-2">
            <Check className="w-3 h-3" /> Looks good
          </p>
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => setMode('choose')}
              variant="ghost"
              size="md"
              fullWidth
            >
              Change
            </Button>
            <Button onClick={save} size="md" fullWidth disabled={pending}>
              {pending ? 'Saving…' : 'Use this →'}
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p className="font-mono text-xs uppercase tracking-widest text-blood mt-4" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
