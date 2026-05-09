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
  max_players: number;
  min_players: number;
  quick_mode: boolean;
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
  prompter_player_id: string | null;
  question: string;
  declared_answer: 'truth' | 'cap' | null;
  recording_url: string | null;
  sus_level: number | null;
  analysis_summary: string | null;
  is_custom: boolean;
  started_at: string;
  ends_at: string | null;
  revealed_at: string | null;
}

export const ROUND_OPTIONS = [5, 10, 15, 20] as const;
export const MIN_PLAYERS_TO_START = 2;

export interface RoundVote {
  id: string;
  round_id: string;
  voter_player_id: string;
  vote: 'truth' | 'cap';
  created_at: string;
}

export const DEFAULT_MAX_PLAYERS = 10;

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRoomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

async function activePlayerCount(supabase: SupabaseClient, roomId: string): Promise<number> {
  const { count } = await supabase
    .from('room_players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .is('left_at', null);
  return count ?? 0;
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
    maxPlayers?: number;
    quickMode?: boolean;
  }
): Promise<{ room: Room; player: RoomPlayer }> {
  let code = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    const { count } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('code', code);
    if (!count) break;
    code = generateRoomCode();
  }

  // Clamp max_rounds to the supported preset values; fall back to 5 if the
  // host passes anything weird.
  const requestedRounds = params.maxRounds ?? 5;
  const maxRounds = (ROUND_OPTIONS as readonly number[]).includes(requestedRounds)
    ? requestedRounds
    : 5;

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({
      code,
      host_user_id: params.hostUserId,
      mode: params.mode,
      spice: params.spice,
      locale: params.locale,
      max_rounds: maxRounds,
      max_players: Math.min(params.maxPlayers ?? DEFAULT_MAX_PLAYERS, DEFAULT_MAX_PLAYERS),
      min_players: MIN_PLAYERS_TO_START,
      quick_mode: params.quickMode ?? false,
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

  if (params.userId) {
    const { data: existing } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', params.userId)
      .maybeSingle();
    if (existing) {
      // If they previously left, mark them active again so they show up in
      // the lobby and the activePlayerCount cap counts them. Without this
      // the user appears "stuck out" of their own room after a refresh.
      if (existing.left_at) {
        const { data: refreshed } = await supabase
          .from('room_players')
          .update({ left_at: null })
          .eq('id', existing.id)
          .select()
          .single();
        return { room, player: refreshed ?? { ...existing, left_at: null } };
      }
      return { room, player: existing };
    }
  }

  const count = await activePlayerCount(supabase, room.id);
  if (count >= (room.max_players ?? DEFAULT_MAX_PLAYERS)) {
    throw new Error('Room is full');
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

export interface StartRoundInput {
  roomId: string;
  /**
   * Subject of the round. NULL for quick-mode (no single subject).
   * For a host-typed question aimed at a specific player, pass that player
   * here — they become the prompter who declares truth/cap.
   */
  prompterPlayerId: string | null;
  /** Optional host-typed question. When omitted, picks a random one. */
  customQuestion?: string;
  durationSeconds?: number;
}

export async function startNextRound(
  supabase: SupabaseClient,
  input: StartRoundInput
): Promise<RoomRound> {
  const { data: room } = await supabase
    .from('rooms')
    .select('mode, spice, locale, quick_mode')
    .eq('id', input.roomId)
    .single();
  if (!room) throw new Error('Room not found');

  const customQuestion = input.customQuestion?.trim();
  const isCustom = !!customQuestion;
  const question = isCustom
    ? customQuestion!
    : await pickRandomQuestion(supabase, room.mode, room.spice, room.locale);
  if (!question) throw new Error('No questions available for this pack');

  // In quick mode the round has no single prompter — every active player votes.
  // Otherwise the prompter is the subject; for a host-typed Q targeted at a
  // specific player, that player IS the prompter (they declare truth/cap).
  const prompterPlayerId = room.quick_mode ? null : input.prompterPlayerId;

  const { data: rpcResult, error } = await supabase.rpc('start_next_round_atomic', {
    p_room_id: input.roomId,
    p_prompter_player_id: prompterPlayerId,
    p_question: question,
    p_is_custom: isCustom,
  });

  if (error) throw error;
  const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!row?.id) throw new Error('Failed to start round');

  const endsAt = new Date(Date.now() + (input.durationSeconds ?? 60) * 1000).toISOString();
  const { data: round, error: updateErr } = await supabase
    .from('room_rounds')
    .update({ ends_at: endsAt })
    .eq('id', row.id)
    .select()
    .single();
  if (updateErr || !round) throw updateErr ?? new Error('Failed to finalize round');

  await supabase
    .from('rooms')
    .update({ status: 'playing' })
    .eq('id', input.roomId);

  return round as RoomRound;
}
