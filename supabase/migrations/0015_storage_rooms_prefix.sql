-- ============================================================================
-- Migration 0015: Storage policy for rooms/ prefix in recordings bucket.
--
-- The multiplayer flow creates signed upload URLs via service-role for the
-- rooms/{roundId}-{ts}.(webm|mp4) prefix. The signed URL bypasses RLS for the
-- specific upload, but the existing storage RLS only allowed inserts under
-- the user's own auth.uid()/ folder. This adds an explicit policy to allow
-- service-role inserts under rooms/ so anon prompters can complete uploads.
-- ============================================================================

drop policy if exists "Service role uploads to rooms prefix" on storage.objects;
create policy "Service role uploads to rooms prefix"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and auth.role() = 'service_role'
    and (storage.foldername(name))[1] = 'rooms'
  );

-- Also allow reads via signed URL is already covered by existing
-- "Recordings readable via signed URLs" policy.
