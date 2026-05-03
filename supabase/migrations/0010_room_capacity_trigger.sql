-- ============================================================================
-- Migration 0010: atomic room capacity guard + room cleanup
-- ============================================================================

-- Atomic capacity guard: trigger blocks insert if room is already full,
-- closing the TOCTOU window in lib/rooms.ts where two clients see 9 and both
-- insert.
create or replace function public.enforce_room_capacity() returns trigger
language plpgsql as $$
declare
  cap int;
  cur int;
begin
  select max_players into cap
    from public.rooms
   where id = new.room_id
   for update;
  if cap is null then
    return new;
  end if;
  select count(*) into cur
    from public.room_players
   where room_id = new.room_id
     and left_at is null;
  if cur >= cap then
    raise exception 'Room is full' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_room_capacity on public.room_players;
create trigger trg_enforce_room_capacity
  before insert on public.room_players
  for each row execute function public.enforce_room_capacity();

-- Stale room watchdog: rooms in lobby/playing for >4h with no recent activity
-- get auto-finished. Call from a Vercel cron daily.
create or replace function public.close_stale_rooms()
returns int language plpgsql security definer set search_path = public as $$
declare
  closed int;
begin
  with stale as (
    select id from public.rooms
     where status in ('lobby','playing')
       and updated_at < now() - interval '4 hours'
  )
  update public.rooms r set status = 'finished', finished_at = now()
    from stale s where r.id = s.id;
  get diagnostics closed = row_count;
  return closed;
end $$;

-- ============================================================================
-- DONE.
-- ============================================================================
