import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Schema = z.object({
  friendIds: z.array(z.string().uuid()).min(1).max(50),
  source: z.enum(['contact', 'invite', 'username_search', 'qr']),
});

export async function POST(req: NextRequest) {
  // CSRF defense: only same-origin POST
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Filter self out and dedupe
  const ids = Array.from(new Set(parsed.data.friendIds.filter((id) => id !== auth.user!.id)));
  if (ids.length === 0) return NextResponse.json({ added: 0 });

  // Bilateral consent: only insert the requesting side (me -> friend).
  // The other side requires the recipient to accept (handled by the
  // friend-request accept flow). Previously this auto-inserted both
  // directions, which let any user add themselves to anyone's friends.
  const admin = createServiceRoleClient();

  const rows = ids.map((friendId) => ({
    user_id: auth.user!.id,
    friend_id: friendId,
    source: parsed.data.source,
  }));

  const { error } = await admin.from('friendships').upsert(rows, {
    onConflict: 'user_id,friend_id',
    ignoreDuplicates: true,
  });

  if (error) {
    console.error('[friendships/bulk] upsert failed:', error.message);
    return NextResponse.json({ error: 'Could not add friendships' }, { status: 500 });
  }

  return NextResponse.json({ added: ids.length });
}
