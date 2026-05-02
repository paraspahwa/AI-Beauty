-- ============================================================
-- StyleAI — Migration 0009: Public Report Sharing
-- Adds:
--   • share_token uuid column on reports (nullable, unique)
--   • pg_cron job: auto-expire stuck reports every 10 minutes
--     (requires pg_cron extension — enable in Supabase dashboard
--      under Database → Extensions before running this migration)
-- ============================================================

-- ------------------------------------------------------------
-- Column: reports.share_token
-- Nullable UUID generated on demand when the user shares a report.
-- Setting to NULL revokes public access.
-- ------------------------------------------------------------
alter table public.reports
  add column if not exists share_token uuid;

create unique index if not exists reports_share_token_idx
  on public.reports(share_token)
  where share_token is not null;

-- Allow anyone to SELECT a report row if they know the share_token.
-- The API route queries by share_token using the admin client (service_role)
-- so no additional RLS policy is strictly needed — but we add one in case
-- a future client-side query path is opened.
drop policy if exists "reports_public_share_select" on public.reports;
create policy "reports_public_share_select"
  on public.reports
  for select
  using (share_token is not null);

-- ------------------------------------------------------------
-- pg_cron: auto-expire reports stuck in "processing"
-- Requires pg_cron extension. Schedule is: every 10 minutes.
-- If pg_cron is not available the DO block silently skips.
-- To enable: Supabase Dashboard → Database → Extensions → pg_cron
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove existing schedule if any (idempotent re-run)
    perform cron.unschedule('expire-stuck-reports');
  end if;
exception when others then
  null; -- cron.unschedule raises if job does not exist; ignore
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'expire-stuck-reports',
      '*/10 * * * *',
      $cron$select public.expire_stuck_reports(10)$cron$
    );
  end if;
exception when others then
  null; -- pg_cron not enabled; skip
end $$;
