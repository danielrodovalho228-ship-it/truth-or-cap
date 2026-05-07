-- ============================================================================
-- Migration 0025: Text-based game rework (no recording).
--
-- Adds:
--   * rooms.min_players (default 2): host can't start until met
--   * rooms.quick_mode (default false): all players vote simultaneously
--   * room_rounds.is_custom (default false): host typed the question
--
-- A custom question directed at a specific player simply makes that player
-- the prompter (they answer, others vote). Quick-mode rounds have no
-- prompter at all — every active player votes. So prompter_player_id is
-- relaxed to NULLABLE.
-- The reveal trigger is updated to skip the all-voted check for prompter-less
-- rounds (since everyone is eligible to vote in quick mode).
-- ============================================================================

-- 1. Lobby flags
alter table public.rooms
  add column if not exists min_players int not null default 2 check (min_players between 2 and 10),
  add column if not exists quick_mode boolean not null default false;

-- 2. Round flags
alter table public.room_rounds
  add column if not exists is_custom boolean not null default false;

-- prompter is null for quick-mode rounds (no single subject)
alter table public.room_rounds alter column prompter_player_id drop not null;

-- 3. Updated atomic round start: accepts optional prompter + custom flag.
drop function if exists public.start_next_round_atomic(uuid, uuid, text);

create or replace function public.start_next_round_atomic(
  p_room_id uuid,
  p_prompter_player_id uuid,
  p_question text,
  p_is_custom boolean default false
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
  select current_round + 1 into v_next_round
    from public.rooms where id = p_room_id for update;
  if v_next_round is null then
    raise exception 'room_not_found';
  end if;

  insert into public.room_rounds (
    room_id, round_number, prompter_player_id, question, is_custom
  )
    values (
      p_room_id, v_next_round, p_prompter_player_id, p_question,
      coalesce(p_is_custom, false)
    )
    returning room_rounds.id into v_round_id;

  update public.rooms set current_round = v_next_round, updated_at = now()
    where id = p_room_id;

  return query select v_round_id, v_next_round;
end $$;

-- Re-apply the lockdown from 0020 to the new signature.
revoke execute on function public.start_next_round_atomic(uuid, uuid, text, boolean)
  from anon, authenticated;

comment on function public.start_next_round_atomic is
  'Atomic round increment + insert. Supports custom questions (host-written). '
  'prompter_player_id may be NULL for quick-mode rounds with no single subject.';

-- 4. Reveal allVoted check: skip prompter check when there is no prompter.
create or replace function public.enforce_reveal_allvoted()
returns trigger language plpgsql as $$
declare
  eligible_count int;
  vote_count int;
begin
  if old.revealed_at is not null then return new; end if;
  if new.revealed_at is null then return new; end if;

  -- Quick mode: every active player is an eligible voter (no prompter to skip).
  -- Classic mode: skip the prompter from the eligible set.
  if new.prompter_player_id is null then
    select count(*) into eligible_count
      from public.room_players
     where room_id = new.room_id
       and left_at is null;
  else
    select count(*) into eligible_count
      from public.room_players
     where room_id = new.room_id
       and id <> new.prompter_player_id
       and left_at is null;
  end if;

  select count(*) into vote_count
    from public.round_votes where round_id = new.id;

  if vote_count < eligible_count then
    raise exception using
      errcode = 'P0002',
      message = format('reveal_too_early: %s of %s votes', vote_count, eligible_count);
  end if;

  return new;
end $$;
