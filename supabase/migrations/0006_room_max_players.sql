-- Migration 0006: limit room size to 10 players + active-player count helper.
alter table public.rooms add column if not exists max_players int not null default 10;

-- Helpful index when checking is room full.
create index if not exists room_players_room_active_idx
  on public.room_players(room_id) where left_at is null;
