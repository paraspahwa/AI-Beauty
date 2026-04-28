-- ============================================================
-- StyleAI — Migration 0002
-- Adds:
--   • CHECK constraints on status columns
--   • Additional performance indexes
--   • Atomic payment-completion RPC functions
-- ============================================================

-- ------------------------------------------------------------
-- CHECK constraints on status columns
-- ------------------------------------------------------------
alter table public.reports
  add constraint if not exists reports_status_check
    check (status in ('pending', 'processing', 'ready', 'failed'));

alter table public.payments
  add constraint if not exists payments_status_check
    check (status in ('created', 'paid', 'failed'));

-- ------------------------------------------------------------
-- Additional indexes
-- ------------------------------------------------------------
create index if not exists payments_status_idx  on public.payments(status);
create index if not exists reports_created_idx  on public.reports(created_at desc);

-- ------------------------------------------------------------
-- Atomic payment completion — used by /api/payments/verify
-- Runs all three updates inside a single transaction so no
-- partial state (e.g. payment paid but report still locked)
-- can occur even if the API process is interrupted.
-- ------------------------------------------------------------
create or replace function public.complete_payment(
  p_payment_row_id      uuid,
  p_report_id           uuid,
  p_user_id             uuid,
  p_provider_payment_id text,
  p_provider_signature  text
) returns void
language plpgsql
security definer
as $$
begin
  update public.payments
    set status               = 'paid',
        provider_payment_id  = p_provider_payment_id,
        provider_signature   = p_provider_signature
    where id = p_payment_row_id;

  update public.reports
    set is_paid = true
    where id = p_report_id;

  update public.profiles
    set is_paid = true
    where id = p_user_id;
end;
$$;

-- ------------------------------------------------------------
-- Atomic payment completion for webhooks — used by
-- /api/webhooks/razorpay when report_id is present.
-- ------------------------------------------------------------
create or replace function public.complete_webhook_payment(
  p_payment_row_id      uuid,
  p_report_id           uuid,
  p_user_id             uuid,
  p_provider_payment_id text,
  p_raw                 jsonb
) returns void
language plpgsql
security definer
as $$
begin
  update public.payments
    set status               = 'paid',
        provider_payment_id  = p_provider_payment_id,
        raw                  = p_raw
    where id = p_payment_row_id;

  update public.reports
    set is_paid = true
    where id = p_report_id;

  update public.profiles
    set is_paid = true
    where id = p_user_id;
end;
$$;
