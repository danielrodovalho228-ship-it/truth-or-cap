-- ============================================================================
-- Migration 0029: Public leaderboard RPC.
--
-- Before this migration the public leaderboard at /leaderboard?scope=public
-- sorted profiles by `profiles.current_streak`, but after migration 0028
-- streaks live on `user_xp` and nothing maintains `profiles.current_streak`
-- — every public profile read 0 and the ordering was meaningless.
--
-- This RPC reads from `user_xp` (which is locked behind a self-only RLS
-- policy) via SECURITY DEFINER and returns only public profiles, ranked by
-- total XP. Exposing aggregate XP to anyone visiting the leaderboard is
-- consistent with the friends leaderboard, which already returns the same
-- columns.
-- ============================================================================

create or replace function public.get_public_leaderboard(p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  total_xp int,
  current_level int,
  current_streak int,
  longest_streak int
)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select
    p.id          as user_id,
    p.username,
    p.avatar_url,
    coalesce(x.total_xp, 0)        as total_xp,
    coalesce(x.current_level, 1)   as current_level,
    coalesce(x.current_streak, 0)  as current_streak,
    coalesce(x.longest_streak, 0)  as longest_streak
  from public.profiles p
  left join public.user_xp x on x.user_id = p.id
  where p.is_public = true
  order by
    coalesce(x.total_xp, 0) desc,
    coalesce(x.current_streak, 0) desc,
    p.username asc
  limit greatest(p_limit, 1);
$$;

revoke execute on function public.get_public_leaderboard(int) from public;
grant execute on function public.get_public_leaderboard(int) to anon, authenticated;

-- ============================================================================
-- DONE — verify with:
--   select * from public.get_public_leaderboard(10);
-- ============================================================================
