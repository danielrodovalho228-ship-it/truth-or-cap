import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { verifyPlayerToken, PLAYER_TOKEN_COOKIE } from '@/lib/player-token';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// Multiplayer recording init: generates a signed upload URL pointing to
// rooms/{roundId}{...}.(webm|mp4) which matches the upload route regex.
// Verifies caller is the round prompter (authed by session OR anon by playerId).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { path?: string; contentType?: string; roundId?: string; playerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { path, contentType, roundId: bodyRoundId, playerId } = body;

  if (!path || !contentType) {
    return NextResponse.json({ error: 'path and contentType required' }, { status: 400 });
  }

  // Path must match: rooms/{roundId}{optional-suffix}.{webm|mp4}
  const pathRe = /^rooms\/([A-Za-z0-9-]+?)(?:-\d+)?\.(webm|mp4)$/;
  const match = pathRe.exec(path);
  if (!match) {
    return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
  }
  // Extract roundId from path (or use body.roundId if provided as a check)
  const inferredRoundId = match[1];
  const roundId = bodyRoundId || inferredRoundId;
  if (bodyRoundId && bodyRoundId !== inferredRoundId) {
    return NextResponse.json({ error: 'Path roundId mismatch' }, { status: 400 });
  }

  // Validate content type matches an allowed bucket type
  if (!/^(video|audio)\/(webm|mp4)/.test(contentType)) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, prompter_player_id, room_id, recording_url')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.recording_url) {
    return NextResponse.json({ error: 'Recording already uploaded' }, { status: 409 });
  }

  // Verify caller is the prompter (authed via user_id, OR anon via playerId).
  const { data: prompter } = await admin
    .from('room_players')
    .select('id, user_id')
    .eq('id', round.prompter_player_id)
    .single();
  if (!prompter) return NextResponse.json({ error: 'Prompter not found' }, { status: 404 });

  if (user) {
    if (prompter.user_id && prompter.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
    }
  } else {
    // Anon: must supply playerId == prompter.id AND a valid HMAC playerToken
    // cookie from join (issued by /api/room/join or /api/room/create).
    if (!playerId || playerId !== prompter.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
    }
    const cookieStore = await cookies();
    const token = cookieStore.get(PLAYER_TOKEN_COOKIE)?.value;
    const verified = verifyPlayerToken(token);
    if (!verified || verified.playerId !== playerId || verified.roomId !== round.room_id) {
      return NextResponse.json({ error: 'Player session invalid; rejoin the room.' }, { status: 403 });
    }
  }

  // Use service-role to generate signed upload URL (storage RLS for rooms/
  // prefix is locked to service_role).
  const { data: signed, error: signedErr } = await admin
    .storage
    .from('recordings')
    .createSignedUploadUrl(path);
  if (signedErr || !signed) {
    console.error('[room/recording/init] signed url failed:', signedErr);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    token: signed.token,
    path,
  });
}
