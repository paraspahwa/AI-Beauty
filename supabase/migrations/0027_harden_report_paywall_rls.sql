-- Harden report paywall boundaries at the database layer.
--
-- The app exposes a public Supabase anon key for auth/session work, so browser
-- clients must not be able to read protected report payload columns or set
-- payment-derived unlock flags directly. Trusted Next.js routes use the
-- service-role client and apply ownership + paywall redaction explicitly.

-- Keep owner row filtering for the small set of safe columns granted below.
drop policy if exists "reports_owner_select" on public.reports;
create policy "reports_owner_select"
  on public.reports
  for select
  using (auth.uid() = user_id);

-- Remove broad table reads that exposed full analysis JSON through PostgREST.
revoke select on public.reports from anon;
revoke select on public.reports from authenticated;
grant select (
  id,
  user_id,
  status,
  is_paid,
  is_style_guide_paid,
  created_at,
  face_shape
) on public.reports to authenticated;

-- Direct report mutations can corrupt paid payloads or storage paths. Keep them
-- behind trusted API routes that verify ownership and use the service-role key.
drop policy if exists "reports_owner_insert" on public.reports;
drop policy if exists "reports_owner_update" on public.reports;
revoke insert on public.reports from anon;
revoke insert on public.reports from authenticated;
revoke update on public.reports from anon;
revoke update on public.reports from authenticated;

-- Recommendation rows contain paid analysis payloads, including the separate
-- style-guide add-on result, so they should only be read through trusted APIs.
drop policy if exists "recs_owner_select" on public.recommendations;
revoke select on public.recommendations from anon;
revoke select on public.recommendations from authenticated;

create or replace function public.prevent_client_report_unlock_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_jwt_role text := nullif(current_setting('request.jwt.claim.role', true), '');
begin
  if (
    new.is_paid is distinct from old.is_paid
    or new.is_style_guide_paid is distinct from old.is_style_guide_paid
  ) and not (
    v_jwt_role = 'service_role'
    or (v_jwt_role is null and current_user in ('postgres', 'service_role', 'supabase_admin'))
  ) then
    raise exception 'Report unlock flags can only be changed by trusted payment flows';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reports_prevent_client_unlock_mutation on public.reports;
create trigger trg_reports_prevent_client_unlock_mutation
before update of is_paid, is_style_guide_paid on public.reports
for each row
execute function public.prevent_client_report_unlock_mutation();
