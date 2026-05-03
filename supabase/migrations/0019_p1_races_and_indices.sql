-- ============================================================================
-- Migration 0019: P1 race conditions + perf indices from wave 2 audit
-- ============================================================================

-- 1. Performance: ilike on username does full scan. Add functional lower index.
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- 2. Performance: leaderboard sort `current_streak DESC, total_invites_redeemed DESC`
create index if not exists profiles_leaderboard_idx
  on public.profiles (current_streak desc, total_invites_redeemed desc)
  where is_public is true and username is not null;

-- 3. Performance: room_rounds FK to room_players prompter — for cascade delete
create index if not exists room_rounds_prompter_player_id_idx
  on public.room_rounds (prompter_player_id);

-- 4. Performance: round_votes lookup by voter (for "did I vote" checks)
create index if not exists round_votes_voter_player_id_idx
  on public.round_votes (voter_player_id);

-- 5. Race fix: startNextRound TOCTOU on rooms.current_round.
-- Postgres function that atomically increments + inserts the next round.
create or replace function public.start_next_round_atomic(
  p_room_id uuid,
  p_prompter_player_id uuid,
  p_question text
)
returns table (id uuid, round_number int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_round int;
  v_round_id uuid;
begin
  -- Lock the room row to serialize concurrent host clicks
  select current_round + 1 into v_next_round
    from public.rooms where id = p_room_id for update;
  if v_next_round is null then
    raise exception 'room_not_found';
  end if;

  insert into public.room_rounds (room_id, round_number, prompter_player_id, question)
    values (p_room_id, v_next_round, p_prompter_player_id, p_question)
    returning room_rounds.id into v_round_id;

  update public.rooms set current_round = v_next_round, updated_at = now()
    where id = p_room_id;

  return query select v_round_id, v_next_round;
end $$;

-- 6. Friendship bilateral consent: drop the auto-bidirectional friend_id insert.
-- Replace with a friend_requests table + accept/decline flow (separate PR).
-- For now: at least prevent third-party from forcing bidirectional.
-- (App-level fix in /api/friendships/bulk insert only requesting side)

-- 7. Anon player reconnect: anon needs to find their existing player_id given a
-- valid HMAC token. Helper to look up by (room_id, display_name) when token
-- carries playerId.
-- (App-level: /api/room/join now checks for existing token cookie before insert)

comment on function public.start_next_round_atomic is
  'Atomic round increment + insert. Prevents TOCTOU race when 2 hosts click Start at once.';
