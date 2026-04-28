import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, ANALYSES_PER_USER_PER_HOUR, HOUR_MS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const InitSchema = z.object({
  question: z.string().min(1).max(500),
  declaredAnswer: z.enum(['truth', 'cap']),
  durationMs: z.number().int().min(3_000).max(60_000),
  mimeType: z.string(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit per user — same budget as analyses since each init creates one.
  const rl = rateLimit(`recording:${user.id}`, ANALYSES_PER_USER_PER_HOUR, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many recordings. Try again in ${Math.ceil(rl.resetIn / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = InitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { question, declaredAnswer, durationMs, mimeType } = parsed.data;

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const ext =
    mimeType.includes('mp4') ? 'mp4' :
    mimeType.includes('webm') ? 'webm' :
    'webm';
  const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { data: signed, error: signedErr } = await supabase
    .storage
    .from('recordings')
    .createSignedUploadUrl(fileName);
  if (signedErr || !signed) {
    console.error('[recording/init] signed url failed:', signedErr);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      player_id: user.id,
      player_username: profile.username,
      question,
      declared_answer: declaredAnswer,
      recording_url: fileName,
      recording_duration_ms: durationMs,
    })
    .select('id')
    .single();
  if (gameErr || !game) {
    console.error('[recording/init] insert game failed:', gameErr);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }

  return NextResponse.json({
    gameId: game.id,
    signedUrl: signed.signedUrl,
    token: signed.token,
    path: fileName,
  });
}
