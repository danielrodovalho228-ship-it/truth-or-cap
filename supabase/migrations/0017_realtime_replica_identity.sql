-- ============================================================================
-- Migration 0017: Realtime DELETE event broadcast fix
--
-- Multi-tab realtime test on 2026-05-03 found that DELETE events on
-- room_players were NOT propagating to subscribed clients (INSERT and
-- UPDATE worked fine). The cause was REPLICA IDENTITY DEFAULT — Supabase
-- Realtime can't reconstruct the OLD row payload for DELETE events without
-- it, so the client's `payload.old.id` is undefined and the filter
-- `players.filter(p => p.id !== old.id)` fails to remove the deleted player.
--
-- Setting REPLICA IDENTITY FULL on these tables makes the entire OLD row
-- available in DELETE events so the client can correctly remove the player.
-- ============================================================================

alter table public.room_players replica identity full;
alter table public.rooms        replica identity full;
alter table public.room_rounds  replica identity full;
alter table public.round_votes  replica identity full;

-- ============================================================================
-- Verified live: deleting a player in DB now propagates to all open clients
-- within ~1 second, count drops + player row disappears from the lobby UI.
-- ============================================================================
