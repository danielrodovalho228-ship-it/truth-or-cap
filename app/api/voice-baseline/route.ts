import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// In M03 we just persist that the baseline exists. Real feature extraction
// (pitch, prosody, etc.) lands in M04 when Hume is wired up — at that
// point this endpoint will be expanded to call Hume + write the structured
// features into profiles.voice_baseline_features.
const Schema = z.object({
  path: z.string().min(1).max(256),
  duration_ms: z.number().int().min(1000).max(30_000).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', detail: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Defensive: verify the path is under the user's folder. Storage RLS
  // already enforces this, but rejecting fast saves a roundtrip.
  if (!parsed.data.path.startsWith(`${auth.user.id}/`)) {
    return NextResponse.json({ error: 'Path mismatch' }, { status: 403 });
  }

  const features = {
    storage_path: parsed.data.path,
    duration_ms: parsed.data.duration_ms ?? null,
    captured_at: new Date().toISOString(),
    model_version: 'baseline_v0_pending_hume',
  };

  const { error } = await supabase
    .from('profiles')
    .update({
      voice_baseline_features: features,
      voice_baseline_at: new Date().toISOString(),
    })
    .eq('id', auth.user.id);

  if (error) {
    console.error('[voice-baseline] update failed:', error.message);
    return NextResponse.json({ error: 'Could not save baseline' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
