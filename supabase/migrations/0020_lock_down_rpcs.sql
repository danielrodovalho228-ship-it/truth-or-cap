-- ============================================================================
-- Migration 0020: Lock down SECURITY DEFINER RPCs from anon/authenticated.
--
-- Re-audit found that start_next_round_atomic (defined in 0019) is callable
-- via PostgREST `POST /rest/v1/rpc/start_next_round_atomic` by any anon
-- caller because Supabase's default grants include execute. The API route
-- has a host check, but PostgREST bypasses that.
--
-- Fix: revoke execute. Keep service-role access (used by /api/room/round/start).
-- ============================================================================

revoke execute on function public.start_next_round_atomic(uuid, uuid, text)
  from anon, authenticated;

-- Same defense for the other helpers we expose:
revoke execute on function public.expire_lapsed_premium()
  from anon, authenticated;
revoke execute on function public.expire_old_stripe_events()
  from anon, authenticated;
revoke execute on function public.is_premium_user(uuid)
  from anon, authenticated;
revoke execute on function public.admin_summary()
  from anon, authenticated;
revoke execute on function public.touch_rooms_updated_at()
  from anon, authenticated;
revoke execute on function public.enforce_reveal_allvoted()
  from anon, authenticated;
revoke execute on function public.enforce_room_capacity()
  from anon, authenticated;
