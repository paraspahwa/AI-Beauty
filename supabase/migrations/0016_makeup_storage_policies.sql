-- ============================================================
-- Migration 0016: Storage policies for makeup-results paths
--
-- The makeup try-on feature stores generated images at:
--   makeup-results/{user_id}/{report_id}/{style}_{intensity}.jpg
--
-- makeup-temp/ is no longer used (images passed as data URIs),
-- but we add a permissive service_role-only policy as a guard.
-- ============================================================

-- Allow owners to read their own makeup results
drop policy if exists "makeup_results_owner_read" on storage.objects;
create policy "makeup_results_owner_read"
  on storage.objects for select
  using (
	bucket_id = 'selfies'
	and starts_with(name, 'makeup-results/')
	and auth.uid()::text = split_part(name, '/', 2)
  );

-- Service-role write (API route uses admin client, no auth.uid())
-- RLS is bypassed for the service-role key; this policy is a no-op
-- for the admin client but documents intent for anon/authenticated roles.
drop policy if exists "makeup_results_service_write" on storage.objects;
create policy "makeup_results_service_write"
  on storage.objects for insert
  with check (
	bucket_id = 'selfies'
	and starts_with(name, 'makeup-results/')
  );
