import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Schema = z.object({
  hashes: z
    .array(z.string().regex(/^[a-f0-9]{64}$/))
    .min(1)
    .max(500),
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
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, phone_hash')
    .in('phone_hash', parsed.data.hashes)
    .neq('id', auth.user.id)
    .limit(200);

  if (error) {
    console.error('[contacts/match] query failed:', error.message);
    return NextResponse.json({ error: 'Match failed' }, { status: 500 });
  }

  // Strip phone_hash from response — client doesn't need it back.
  const matched = (data ?? []).map(({ phone_hash, ...rest }) => rest);
  return NextResponse.json({
    matched,
    unmatchedCount: parsed.data.hashes.length - matched.length,
  });
}
