import type { SupabaseClient } from '@supabase/supabase-js';

export type RoomMode = 'family' | 'couple' | 'group';
export type RoomSpice = 'mild' | 'spicy';
export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface Room {
  id: string;
  code: string;
  host_user_id: string | null;
  mode: RoomMode;
  spice: RoomSpice;
  status: RoomStatus;
  current_round: number;
  max_rounds: number;
  locale: string;
  created_at: string;
  finished_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string | null;
  display_name: string;
  avatar: string | null;
  is_host: boolean;
  score: number;
  joined_at: string;
  left_at: string | null;
}

export interface RoomRound {
  id: string;
  room_id: string;
  round_number: number;
  prompter_player_id: string;
  question: string;
  declared_answer: 'truth' | 'cap' | null;
  recording_url: string | null;
  sus_level: number | null;
  analysis_summary: string | null;
  started_at: string;
  ends_at: string | null;
  revealed_at: string | null;
}

// Friendly room code: 6 chars, alphabet without ambiguous letters (no 0/O/1/I/L).
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRoomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

export async function createRoom(
  supabase: SupabaseClient,
  params: {
    hostUserId: string;
    hostDisplayName: string;
    mode: RoomMode;
    spice: RoomSpice;
    locale: string;
    maxRounds?: number;
  }
): Promise<{ room: Room; player: RoomPlayer }> {
  let code = generateRoomCode();
  // Retry on collision (very rare with 6 chars from 31-letter alphabet).
  for (let i = 0; i < 5; i++) {
    const { count } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('code', code);
    if (!count) break;
    code = generateRoomCode();
  }

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({
      code,
      host_user_id: params.hostUserId,
      mode: params.mode,
      spice: params.spice,
      locale: params.locale,
      max_rounds: params.maxRounds ?? 5,
    })
    .select()
    .single();

  if (roomErr || !room) throw roomErr ?? new Error('Failed to create room');

  const { data: player, error: playerErr } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: params.hostUserId,
      display_name: params.hostDisplayName,
      is_host: true,
    })
    .select()
    .single();

  if (playerErr || !player) throw playerErr ?? new Error('Failed to create host player');

  return { room, player };
}

export async function joinRoom(
  supabase: SupabaseClient,
  params: {
    code: string;
    userId: string | null;
    displayName: string;
    avatar?: string;
  }
): Promise<{ room: Room; player: RoomPlayer }> {
  const code = params.code.trim().toUpperCase();

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .single();
  if (roomErr || !room) throw new Error('Room not found');
  if (room.status === 'finished') throw new Error('This room has ended');

  // If user already in this room, return existing player record.
  if (params.userId) {
    const { data: existing } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', params.userId)
      .maybeSingle();
    if (existing) return { room, player: existing };
  }

  const { data: player, error: playerErr } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: params.userId,
      display_name: params.displayName,
      avatar: params.avatar ?? null,
    })
    .select()
    .single();

  if (playerErr || !player) throw playerErr ?? new Error('Failed to join room');

  return { room, player };
}

export async function pickRandomQuestion(
  supabase: SupabaseClient,
  mode: RoomMode,
  spice: RoomSpice,
  locale: string
): Promise<string | null> {
  const { data } = await supabase
    .from('question_packs')
    .select('question')
    .eq('mode', mode)
    .eq('spice', spice)
    .eq('locale', locale);
  if (!data || data.length === 0) {
    // Fallback to EN mild if requested locale/spice has no entries.
    const { data: fallback } = await supabase
      .from('question_packs')
      .select('question')
      .eq('mode', mode)
      .eq('spice', 'mild')
      .eq('locale', 'en');
    if (!fallback || fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)].question;
  }
  return data[Math.floor(Math.random() * data.length)].question;
}

export async function startNextRound(
  supabase: SupabaseClient,
  roomId: string,
  prompterPlayerId: string,
  durationSeconds = 30
): Promise<RoomRound> {
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (!room) throw new Error('Room not found');

  const question = await pickRandomQuestion(supabase, room.mode, room.spice, room.locale);
  if (!question) throw new Error('No questions available for this pack');

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationSeconds * 1000);

  const { data: round, error } = await supabase
    .from('room_rounds')
    .insert({
      room_id: roomId,
      round_number: room.current_round + 1,
      prompter_player_id: prompterPlayerId,
      question,
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single();

  if (error || !round) throw error ?? new Error('Failed to start round');

  await supabase
    .from('rooms')
    .update({ status: 'playing', current_round: room.current_round + 1 })
    .eq('id', roomId);

  return round;
}
