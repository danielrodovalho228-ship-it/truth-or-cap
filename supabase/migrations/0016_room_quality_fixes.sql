-- ============================================================================
-- Migration 0016: Multiplayer hardening from 10-concurrent audit
-- 1. Add rooms.updated_at + trigger so close_stale_rooms cron actually works.
-- 2. Reveal allVoted check is enforced via trigger (server-side, can't be
--    bypassed by host's dev tools).
-- ============================================================================

-- 1. updated_at column + trigger
alter table public.rooms add column if not exists updated_at timestamptz not null default now();
create or replace function public.touch_rooms_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists touch_rooms on public.rooms;
create trigger touch_rooms before update on public.rooms
  for each row execute function public.touch_rooms_updated_at();

-- Backfill existing rows with their created_at
update public.rooms set updated_at = created_at where updated_at is null;

-- 2. Reveal allVoted enforcement: prevent revealing a round when not all
--    eligible (non-prompter, still-in-room) players have voted.
create or replace function public.enforce_reveal_allvoted()
returns trigger language plpgsql as $$
declare
  eligible_count int;
  vote_count int;
begin
  -- Only fire when revealed_at flips from NULL to non-NULL.
  if old.revealed_at is not null then return new; end if;
  if new.revealed_at is null then return new; end if;

  -- Count active non-prompter players still in the room.
  select count(*) into eligible_count
    from public.room_players
   where room_id = new.room_id
     and id <> new.prompter_player_id
     and left_at is null;

  select count(*) into vote_count
    from public.round_votes where round_id = new.id;

  if vote_count < eligible_count then
    raise exception using
      errcode = 'P0002',
      message = format('reveal_too_early: %s of %s votes', vote_count, eligible_count);
  end if;

  return new;
end $$;
drop trigger if exists enforce_reveal_allvoted on public.room_rounds;
create trigger enforce_reveal_allvoted before update on public.room_rounds
  for each row execute function public.enforce_reveal_allvoted();
