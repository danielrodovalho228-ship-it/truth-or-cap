-- ============================================================================
-- Migration 0023: Audit hardening — XSS, search_path, indices, retention.
-- ============================================================================

-- 1. Drop image/svg+xml from avatars bucket (stored XSS via <script> in SVG)
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'avatars';

-- 2. Lock down SECURITY DEFINER functions — search_path injection defense
alter function public.increment_invites_sent(uuid)
  set search_path = public, pg_catalog;
alter function public.qotd_bump(uuid, text)
  set search_path = public, pg_catalog;
alter function public.enforce_room_capacity()
  set search_path = public, pg_catalog;
alter function public.touch_rooms_updated_at()
  set search_path = public, pg_catalog;
alter function public.enforce_reveal_allvoted()
  set search_path = public, pg_catalog;

-- 3. Drop redundant indices (Postgres auto-creates UNIQUE-backing indices)
drop index if exists public.rooms_code_idx;
drop index if exists public.qotd_active_idx;
drop index if exists public.challenge_active_idx;

-- 4. profiles INSERT + DELETE policies (currently only handle_new_user trigger
-- can insert; explicit policies for documentation + safety)
drop policy if exists "Auto-create profile on signup" on public.profiles;
create policy "Auto-create profile on signup" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "User can delete own profile" on public.profiles;
create policy "User can delete own profile" on public.profiles
  for delete using (auth.uid() = id);

-- 5. Recordings retention (Privacy claims 7 days)
alter table public.games add column if not exists scheduled_purge_at timestamptz
  default (now() + interval '7 days');

create index if not exists games_scheduled_purge_idx
  on public.games (scheduled_purge_at)
  where scheduled_purge_at < now();

-- 6. Retention function for cron to call
create or replace function public.purge_expired_games()
returns int language plpgsql security definer set search_path = public, pg_catalog as $$
declare deleted int;
begin
  delete from public.games where scheduled_purge_at < now();
  get diagnostics deleted = row_count;
  return deleted;
end $$;
revoke execute on function public.purge_expired_games() from anon, authenticated;
