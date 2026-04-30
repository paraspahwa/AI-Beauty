-- ============================================================
-- StyleAI — Migration 0003 Security Hardening
-- Adds:
--   • RPC ownership/status invariants + fixed search_path
--   • RPC execute privileges locked to service_role
--   • Unique partial index: one processing report per user
--   • Trigger to prevent payments paid -> failed regression
-- ============================================================

-- ------------------------------------------------------------
-- Concurrency guard: max one processing report per user
-- ------------------------------------------------------------
create unique index if not exists reports_one_processing_per_user_idx
  on public.reports(user_id)
  where status = 'processing';

-- ------------------------------------------------------------
-- Prevent paid -> failed status regressions
-- ------------------------------------------------------------
create or replace function public.prevent_paid_to_failed_regression()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'paid' and new.status = 'failed' then
    raise exception 'Invalid payment status transition paid -> failed for payment %', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_prevent_paid_to_failed on public.payments;
create trigger trg_payments_prevent_paid_to_failed
before update of status on public.payments
for each row
execute function public.prevent_paid_to_failed_regression();

-- ------------------------------------------------------------
-- Hardened RPC used by /api/payments/verify
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
set search_path = public, pg_temp
as $$
declare
  v_updated int;
begin
  update public.payments
    set status               = 'paid',
        provider_payment_id  = p_provider_payment_id,
        provider_signature   = p_provider_signature
  where id = p_payment_row_id
    and user_id = p_user_id
    and report_id = p_report_id
    and status in ('created', 'failed');

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Payment row not eligible for completion';
  end if;

  update public.reports
    set is_paid = true
  where id = p_report_id
    and user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Report ownership/status invariant failed';
  end if;

  update public.profiles
    set is_paid = true
  where id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Profile not found for user';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Hardened RPC used by /api/webhooks/razorpay
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
set search_path = public, pg_temp
as $$
declare
  v_updated int;
begin
  update public.payments
    set status               = 'paid',
        provider_payment_id  = p_provider_payment_id,
        raw                  = p_raw
  where id = p_payment_row_id
    and user_id = p_user_id
    and report_id = p_report_id
    and status in ('created', 'failed');

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    -- idempotent success for already-paid rows matching ownership invariants
    perform 1
      from public.payments
      where id = p_payment_row_id
        and user_id = p_user_id
        and report_id = p_report_id
        and status = 'paid';

    if not found then
      raise exception 'Webhook payment row not eligible for completion';
    end if;
  end if;

  update public.reports
    set is_paid = true
  where id = p_report_id
    and user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Webhook report ownership invariant failed';
  end if;

  update public.profiles
    set is_paid = true
  where id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Webhook profile not found for user';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Restrict RPC execution privileges
-- ------------------------------------------------------------
revoke all on function public.complete_payment(uuid, uuid, uuid, text, text) from public;
revoke all on function public.complete_payment(uuid, uuid, uuid, text, text) from anon;
revoke all on function public.complete_payment(uuid, uuid, uuid, text, text) from authenticated;
grant execute on function public.complete_payment(uuid, uuid, uuid, text, text) to service_role;

revoke all on function public.complete_webhook_payment(uuid, uuid, uuid, text, jsonb) from public;
revoke all on function public.complete_webhook_payment(uuid, uuid, uuid, text, jsonb) from anon;
revoke all on function public.complete_webhook_payment(uuid, uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.complete_webhook_payment(uuid, uuid, uuid, text, jsonb) to service_role;
