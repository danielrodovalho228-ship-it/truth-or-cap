-- ============================================================================
-- Migration 0022: RLS hardening from wave 6 audit (commit 1b2701c).
--
-- Three P1 game-integrity / privacy issues:
-- 1. room_rounds.declared_answer + sus_level leak pre-reveal — voters cheat
-- 2. profiles exposes stripe_*, is_admin, is_premium, premium_* to anon
-- 3. votes + qotd_votes accept arbitrary voter_ip_hash from client → bypass
--    server-side rate limit + per-IP uniqueness via hash rotation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. room_rounds: hide declared_answer + sus_level until revealed_at is set.
-- ----------------------------------------------------------------------------

drop policy if exists "Public reads room_rounds" on public.room_rounds;

-- Read all metadata BUT not the spoilers, until reveal.
-- Authed-as-host or authed-as-prompter can see everything.
create policy "Reveal-gated reads room_rounds" on public.room_rounds
  for select
  using (
    revealed_at is not null
    or auth.uid() in (
      select host_user_id from public.rooms where id = room_rounds.room_id
    )
    or auth.uid() in (
      select user_id from public.room_players where id = room_rounds.prompter_player_id
    )
    -- Anon prompter case: handled at API layer (server reads via service role)
  );

-- The simpler approach if the above breaks UI: revoke columns instead.
-- (Choose this if voters need to see the row but not the spoilers.)
revoke select (declared_answer, sus_level, analysis_summary)
  on public.room_rounds from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. profiles: revoke sensitive columns from anon/authenticated.
-- Service-role bypass column privileges, so /api/admin/users + /api/stripe/*
-- continue working. UI can still show username/avatar/streak.
-- ----------------------------------------------------------------------------

revoke select (
  stripe_customer_id,
  stripe_subscription_id,
  is_admin,
  is_premium,
  premium_until,
  premium_granted_at,
  premium_granted_by,
  voice_baseline_features
) on public.profiles from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. votes + qotd_votes: prevent client-side direct insert.
-- The API routes use service role; lock down direct client access.
-- ----------------------------------------------------------------------------

drop policy if exists "Anyone can vote" on public.votes;
create policy "API-only vote inserts" on public.votes
  for insert with check (false);
-- Existing SELECT policy (public reads vote counts) stays.

drop policy if exists "Anyone can vote QOTD" on public.qotd_votes;
create policy "API-only qotd vote inserts" on public.qotd_votes
  for insert with check (false);

-- ----------------------------------------------------------------------------
-- DONE. Verify with:
--   select tablename, policyname, cmd, qual, with_check from pg_policies
--    where tablename in ('room_rounds','votes','qotd_votes','profiles')
--    order by tablename, policyname;
-- ----------------------------------------------------------------------------
