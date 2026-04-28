-- ============================================================================
-- Truth or Cap — Storage buckets setup
-- Apply this in Supabase Dashboard → SQL Editor → New Query → Run
-- AFTER applying 0001_initial_schema.sql
-- ============================================================================

-- Create buckets (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings',
  'recordings',
  false,
  52428800, -- 50 MB
  array['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4']
)
on conflict (id) do update
set 
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-baselines',
  'voice-baselines',
  false,
  5242880, -- 5 MB
  array['audio/webm', 'audio/mp4']
)
on conflict (id) do update
set 
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set 
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================

-- Recordings: users upload to their own folder
drop policy if exists "Users upload own recordings" on storage.objects;
create policy "Users upload own recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Recordings: only readable via signed URLs (service role)
drop policy if exists "Recordings readable via signed URLs" on storage.objects;
create policy "Recordings readable via signed URLs"
  on storage.objects for select
  using (bucket_id = 'recordings' and auth.role() = 'service_role');

-- Recordings: users can delete own
drop policy if exists "Users delete own recordings" on storage.objects;
create policy "Users delete own recordings"
  on storage.objects for delete
  using (
    bucket_id = 'recordings'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Voice baselines: users upload + read own
drop policy if exists "Users upload own voice baseline" on storage.objects;
create policy "Users upload own voice baseline"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-baselines'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own voice baseline" on storage.objects;
create policy "Users read own voice baseline"
  on storage.objects for select
  using (
    bucket_id = 'voice-baselines'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars: public read, owner write
drop policy if exists "Avatars publicly readable" on storage.objects;
create policy "Avatars publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Done
-- ============================================================================
