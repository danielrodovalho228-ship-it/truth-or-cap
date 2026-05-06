-- Orphan anon player cleanup
-- ============================================================================
-- When an anonymous player closes their browser without explicitly leaving,
-- their `room_players` row stays around forever (their player_token expires
-- after 24h but never triggers a row delete). This bloats roster counts and
-- breaks `room_players_room_user_unique` heuristics for repeat-rejoiners.
--
-- Strategy: prune anon rows (`user_id IS NULL`) that joined more than 24h
-- ago and never set `left_at`. Authenticated users keep their seat — they
-- can rejoin via auth without losing history.

create or replace function public.cleanup_orphan_anon_players()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.room_players
  where user_id is null
    and left_at is null
    and joined_at < now() - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Lock down: only the service role / cron should call this.
revoke execute on function public.cleanup_orphan_anon_players() from public;
revoke execute on function public.cleanup_orphan_anon_players() from authenticated;
revoke execute on function public.cleanup_orphan_anon_players() from anon;
