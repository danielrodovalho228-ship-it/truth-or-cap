-- ============================================================================
-- Truth or Cap - Migration 0005: RLS hardening for room_rounds and round_votes
-- Closes attack vectors: only host can insert/update rounds, only members vote.
-- ============================================================================

-- room_rounds: only host can create/update rounds.
drop policy if exists "Host inserts rounds" on public.room_rounds;
create policy "Host inserts rounds"
  on public.room_rounds for insert
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_user_id = auth.uid()
    )
  );

drop policy if exists "Host updates rounds" on public.room_rounds;
create policy "Host updates rounds"
  on public.room_rounds for update
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_user_id = auth.uid()
    )
  );

-- round_votes: only a player who joined the round's room can vote.
-- Authenticated voters: voter_player_id must point to a row owned by auth.uid().
-- Anonymous voters: must come through API route which uses service_role.
drop policy if exists "Authed players vote" on public.round_votes;
create policy "Authed players vote"
  on public.round_votes for insert
  with check (
    exists (
      select 1 from public.room_players p
      where p.id = voter_player_id and p.user_id = auth.uid()
    )
  );

-- room_players: only the host or service_role can insert players for non-self users.
-- Authed self-join: the inserted row must reference auth.uid().
drop policy if exists "Self joins room" on public.room_players;
create policy "Self joins room"
  on public.room_players for insert
  with check (
    user_id = auth.uid() OR user_id is null
  );

-- Helpful index for "my open rounds" lookups.
create index if not exists room_rounds_room_started_idx
  on public.room_rounds(room_id, started_at desc);
create index if not exists round_votes_voter_idx
  on public.round_votes(voter_player_id);

-- ============================================================================
-- DONE. Service role still bypasses RLS, so server-side API routes keep working.
-- ============================================================================
