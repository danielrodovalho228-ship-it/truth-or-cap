-- ============================================================================
-- Migration 0021: lock down 4 more SECURITY DEFINER RPCs missed in 0020.
--
-- Re-audit wave 5 found these still callable via PostgREST anon:
-- - increment_invites_sent(uuid): inflates ANY user's total_invites_sent
-- - signups_by_day(): exposes daily user signup counts
-- - total_cost_in_window(): exposes API spend internal data
-- - close_stale_rooms(): low-impact DoS-ish but should be private
-- ============================================================================

revoke execute on function public.increment_invites_sent(uuid)
  from anon, authenticated;
revoke execute on function public.signups_by_day()
  from anon, authenticated;
revoke execute on function public.total_cost_in_window(numeric)
  from anon, authenticated;
revoke execute on function public.close_stale_rooms()
  from anon, authenticated;
