import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Resolve a short-lived signed URL for a recording. We use service role
// because the `recordings` bucket is private + read-restricted to service
// role. Authorization is enforced here: only the owner OR a public game's
// viewer can fetch a URL.
//
// Body: { gameId: uuid }
// Returns: { url: string } | { error: string }

const Schema = z.object({
  gameId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Authorization check using anon RLS — game must be visible to caller.
  const { data: game } = await supabase
    .from('games')
    .select('recording_url, is_public, player_id')
    .eq('id', parsed.data.gameId)
    .maybeSingle();
  if (!game) return NextResponse.json({ error: 'Game not found or private' }, { status: 404 });

  const isOwner = user && user.id === game.player_id;
  if (!game.is_public && !isOwner) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Bucket is service-role-only; sign the URL with the privileged client.
  const admin = createServiceRoleClient();
  const { data: signed, error: signErr } = await admin.storage
    .from('recordings')
    .createSignedUrl(game.recording_url, 60 * 10); // 10 min
  if (signErr || !signed?.signedUrl) {
    console.error('[recording/url] sign failed:', signErr);
    return NextResponse.json({ error: 'Could not sign URL' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
