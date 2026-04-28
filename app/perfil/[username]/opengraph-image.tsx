import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { generatedAvatarUrl } from '@/lib/avatar';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Truth or Cap profile';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function OG({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, current_streak')
    .ilike('username', username)
    .maybeSingle();

  const handle = profile?.username ?? username;
  const avatar = profile?.avatar_url ?? generatedAvatarUrl(handle);
  const streak = profile?.current_streak ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0a0a0a',
          color: '#f5f0e6',
          padding: 60,
          alignItems: 'center',
          gap: 40,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 16,
            background: 'repeating-linear-gradient(45deg, #fef08a, #fef08a 14px, #000 14px, #000 28px)',
          }}
        />
        <img
          src={avatar}
          width={240}
          height={240}
          style={{ border: '4px solid #f5f0e6', objectFit: 'cover' }}
          alt=""
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 22, letterSpacing: 8, color: '#fbbf24', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Truth or Cap profile
          </span>
          <span style={{ fontSize: 96, fontWeight: 900, marginTop: 8, lineHeight: 1 }}>@{handle}</span>
          <span style={{ fontSize: 28, color: '#8a857c', marginTop: 16 }}>
            {streak}-day streak · Spotting caps
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0, height: 16,
            background: 'repeating-linear-gradient(45deg, #fef08a, #fef08a 14px, #000 14px, #000 28px)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
