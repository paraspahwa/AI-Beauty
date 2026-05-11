-- ============================================================
-- Migration 0018: Storage policies for virtual try-on results
--
-- The virtual try-on feature stores generated images at:
--   tryon-results/{user_id}/{report_id}/{timestamp}.jpg
--
-- Owners can read their own results.
-- Service-role (admin client) performs all writes — RLS is
-- bypassed for the service-role key; this policy documents intent.
-- ============================================================

-- Allow owners to read their own try-on results
drop policy if exists "tryon_results_owner_read" on storage.objects;
create policy "tryon_results_owner_read"
  on storage.objects for select
  using (
	bucket_id = 'selfies'
	and starts_with(name, 'tryon-results/')
	and auth.uid()::text = split_part(name, '/', 2)
  );

-- Service-role write — documents intent (bypassed for admin client)
drop policy if exists "tryon_results_service_write" on storage.objects;
create policy "tryon_results_service_write"
  on storage.objects for insert
  with check (
	bucket_id = 'selfies'
	and starts_with(name, 'tryon-results/')
  );
