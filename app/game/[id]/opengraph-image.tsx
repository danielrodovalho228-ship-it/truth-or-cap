import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Truth or Cap game';

interface Props {
  params: Promise<{ id: string }>;
}

function colorFor(sus: number): string {
  if (sus >= 70) return '#dc2626';
  if (sus >= 40) return '#fbbf24';
  return '#a8ff00';
}

export default async function OG({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('player_username, question')
    .eq('id', id)
    .maybeSingle();
  const { data: analysis } = await supabase
    .from('analyses')
    .select('sus_level')
    .eq('game_id', id)
    .maybeSingle();

  const username = game?.player_username ?? 'someone';
  const question = (game?.question ?? 'Truth or Cap').slice(0, 140);
  const sus = analysis?.sus_level ?? 50;
  const susColor = colorFor(sus);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0a',
          color: '#f5f0e6',
          padding: 60,
          position: 'relative',
        }}
      >
        {/* Top tape */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 16,
            background:
              'repeating-linear-gradient(45deg, #fef08a, #fef08a 14px, #000 14px, #000 28px)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 30 }}>
          <span style={{ fontSize: 22, letterSpacing: 8, color: '#8a857c', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            @{username} on Truth or Cap
          </span>
        </div>

        <div style={{ display: 'flex', flex: 1, gap: 50, marginTop: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              &ldquo;{question}&rdquo;
            </span>
            <span style={{ marginTop: 'auto', fontSize: 22, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 6, fontFamily: 'monospace' }}>
              Can you spot the cap?
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              border: '4px solid #f5f0e6',
              padding: '24px 32px',
              minWidth: 280,
            }}
          >
            <span style={{ fontSize: 18, letterSpacing: 6, color: '#8a857c', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              SUS LEVEL
            </span>
            <span
              style={{
                fontSize: 180,
                fontWeight: 900,
                color: susColor,
                lineHeight: 1,
              }}
            >
              {sus}%
            </span>
          </div>
        </div>

        {/* Bottom tape */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 16,
            background:
              'repeating-linear-gradient(45deg, #fef08a, #fef08a 14px, #000 14px, #000 28px)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
