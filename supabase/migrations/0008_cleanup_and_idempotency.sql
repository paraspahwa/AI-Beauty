-- ============================================================
-- StyleAI — Migration 0008 Cleanup & Webhook Idempotency
-- Adds:
--   • expire_stuck_reports() RPC — marks reports stuck in
--     "processing" for > 10 minutes as "failed"
--   • webhook_events table — idempotency log for Razorpay
--     webhook events (prevents double-processing)
--   • Unique index on webhook_events(provider_event_id)
-- ============================================================

-- ------------------------------------------------------------
-- RPC: expire_stuck_reports
-- Call periodically (e.g. via Supabase pg_cron or manually).
-- Marks any report in "processing" older than p_threshold_minutes
-- as "failed" with an internal error note.
-- Returns the count of rows updated.
-- ------------------------------------------------------------
create or replace function public.expire_stuck_reports(
  p_threshold_minutes int default 10
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count int;
begin
  update public.reports
  set
    status = 'failed',
    error  = 'Report expired: stuck in processing for more than ' || p_threshold_minutes || ' minutes'
  where
    status = 'processing'
    and created_at < now() - (p_threshold_minutes || ' minutes')::interval;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke execute on function public.expire_stuck_reports from public;
grant  execute on function public.expire_stuck_reports to service_role;

-- ------------------------------------------------------------
-- Table: webhook_events
-- One row per Razorpay event delivery attempt.
-- provider_event_id is the Razorpay event ID from the payload.
-- Unique constraint prevents double-processing.
-- ------------------------------------------------------------
create table if not exists public.webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null default 'razorpay',
  provider_event_id  text not null,
  event_type         text not null,
  processed_at       timestamptz not null default now(),
  raw                jsonb
);

create unique index if not exists webhook_events_provider_event_id_idx
  on public.webhook_events(provider, provider_event_id);

-- No RLS needed — only service_role ever touches this table
alter table public.webhook_events enable row level security;

-- Deny all access from anon/authenticated — only service_role bypasses RLS
create policy "webhook_events_deny_all"
  on public.webhook_events
  using (false);

-- ------------------------------------------------------------
-- RPC: record_webhook_event
-- Returns true if the event was inserted (first delivery),
-- false if it already existed (duplicate — caller should skip).
-- ------------------------------------------------------------
create or replace function public.record_webhook_event(
  p_provider          text,
  p_provider_event_id text,
  p_event_type        text,
  p_raw               jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.webhook_events
    (provider, provider_event_id, event_type, raw)
  values
    (p_provider, p_provider_event_id, p_event_type, p_raw)
  on conflict (provider, provider_event_id) do nothing;

  return found;   -- true = inserted, false = duplicate skipped
end;
$$;

revoke execute on function public.record_webhook_event from public;
grant  execute on function public.record_webhook_event to service_role;
