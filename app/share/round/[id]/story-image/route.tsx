import { ImageResponse } from 'next/og';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, room_id, prompter_player_id, question, sus_level, declared_answer, analysis_summary, revealed_at')
    .eq('id', id)
    .maybeSingle();

  const sus = Math.round(Number(round?.sus_level ?? 50));
  const question = round?.question ?? '';
  const declared = round?.declared_answer?.toUpperCase() ?? 'TRUTH';
  const summary = round?.analysis_summary ?? '';

  // Color zones for SUS LEVEL
  const tone =
    sus >= 75 ? { from: '#dc2626', to: '#7c2d12', label: 'CAPPER' } :
    sus >= 55 ? { from: '#f97316', to: '#7c2d12', label: 'SHADY' } :
    sus >= 35 ? { from: '#fbbf24', to: '#78350f', label: 'ON THE FENCE' } :
    sus >= 20 ? { from: '#22c55e', to: '#14532d', label: 'CLEAN' } :
                { from: '#10b981', to: '#064e3b', label: 'STONE COLD TRUTH' };

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(160deg, ${tone.from} 0%, ${tone.to} 100%)`,
          padding: 80,
          fontFamily: 'system-ui',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 36, opacity: 0.85, letterSpacing: 6, textTransform: 'uppercase', fontWeight: 700 }}>Truth or Cap</div>
          <div style={{ fontSize: 28, opacity: 0.75 }}>truthorcapapp.com</div>
        </div>

        <div style={{ marginTop: 80, fontSize: 28, opacity: 0.75, letterSpacing: 4, textTransform: 'uppercase' }}>The question</div>
        <div style={{ marginTop: 24, fontSize: 56, fontWeight: 800, lineHeight: 1.1, maxWidth: 920 }}>
          &quot;{question}&quot;
        </div>

        <div style={{ marginTop: 80, fontSize: 32, opacity: 0.85, letterSpacing: 6, textTransform: 'uppercase' }}>SUS LEVEL</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 4 }}>
          <div style={{ fontSize: 380, fontWeight: 900, lineHeight: 1, letterSpacing: -8 }}>{sus}</div>
          <div style={{ fontSize: 120, fontWeight: 800, opacity: 0.85 }}>%</div>
        </div>
        <div style={{ marginTop: -16, fontSize: 64, fontWeight: 900, letterSpacing: 4 }}>{tone.label}</div>

        <div style={{ marginTop: 60, fontSize: 30, opacity: 0.85 }}>
          They claimed: <span style={{ fontWeight: 800 }}>{declared}</span>
        </div>
        {summary ? (
          <div style={{ marginTop: 16, fontSize: 26, opacity: 0.7, fontFamily: 'monospace' }}>{summary}</div>
        ) : null}

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 700, opacity: 0.9 }}>Vote Truth or Cap</div>
          <div style={{ fontSize: 28, opacity: 0.7 }}>Free. 90s setup.</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
