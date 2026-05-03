-- ============================================================================
-- Migration 0018: Phone-hash exposure fix from security audit (commit 8e90921)
--
-- profiles.phone_hash is set via /api/contacts/match for friend-finder, but
-- the existing "Public profiles are viewable" SELECT policy lets any anon
-- query read the phone_hash column. Combined with the bundled-to-client
-- PHONE_SALT in lib/contacts.ts, an attacker can do a rainbow-table attack
-- against any phone-number list to deanonymize linked users.
--
-- Fix: revoke SELECT(phone_hash) from anon + authenticated. Service role
-- (the only role that should ever read phone_hash, e.g. friend matcher)
-- bypasses column privileges.
-- ============================================================================

revoke select (phone_hash) on public.profiles from anon, authenticated;

-- ============================================================================
-- Verify with:  select column_name, table_name from information_schema
--   .column_privileges where grantee in ('anon','authenticated')
--   and table_name='profiles' and column_name='phone_hash';
-- (should return zero rows)
-- ============================================================================
