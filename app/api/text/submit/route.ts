import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, ANALYSES_PER_USER_PER_HOUR, HOUR_MS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// /api/text/submit — solo text-based game creation.
// Body: { question, declaredAnswer, textAnswer }
// Returns: { gameId } — caller hits /api/analyze next, same as the video flow.

const SubmitSchema = z.object({
  question: z.string().min(1).max(500),
  declaredAnswer: z.enum(['truth', 'cap']),
  textAnswer: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Same per-user budget as recordings — each text submission triggers one
  // analysis (Claude only, no Whisper/Hume), so the budget is generous.
  const rl = rateLimit(`text:${user.id}`, ANALYSES_PER_USER_PER_HOUR, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many submissions. Try again in ${Math.ceil(rl.resetIn / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { question, declaredAnswer, textAnswer } = parsed.data;
  const trimmed = textAnswer.trim();
  if (trimmed.length === 0) {
    return NextResponse.json({ error: 'Answer cannot be empty.' }, { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      player_id: user.id,
      player_username: profile.username,
      question,
      declared_answer: declaredAnswer,
      mode: 'text',
      text_answer: trimmed,
    })
    .select('id')
    .single();
  if (gameErr || !game) {
    console.error('[text/submit] insert game failed:', gameErr);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }

  return NextResponse.json({ gameId: game.id });
}
