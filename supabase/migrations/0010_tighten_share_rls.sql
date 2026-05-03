-- ============================================================
-- StyleAI — Migration 0010: Tighten public share RLS policy
--
-- Problem (0009): The "reports_public_share_select" policy used
--   USING (share_token is not null)
-- This allowed any authenticated Supabase client to SELECT any
-- report row that has been shared — without knowing the token.
--
-- Fix: Require the caller to supply the exact token via a
-- request-scoped setting, set by a security-definer helper
-- function that validates the token first.
--
-- All existing API routes that read shared reports use the
-- service_role (admin) client which bypasses RLS entirely, so
-- this change has no runtime impact on current code.  It closes
-- the latent hole if a future client-side query path is opened.
-- ============================================================

-- Drop the overly-broad policy added in 0009
drop policy if exists "reports_public_share_select" on public.reports;

-- Tighter replacement: only rows whose share_token matches the
-- token the caller declares via set_config().
-- A caller that does not set the config gets an empty string,
-- which never matches a real UUID.
create policy "reports_public_share_select"
  on public.reports
  for select
  using (
	share_token is not null
	and share_token::text = current_setting('app.share_token', true)
  );

-- ----------------------------------------------------------------
-- Helper: set_share_context(token uuid)
-- Security-definer so any anon caller can invoke it, but the
-- function validates that the token actually exists before writing
-- the session-local setting.  Returns true if the token is valid.
-- ----------------------------------------------------------------
create or replace function public.set_share_context(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exists boolean;
begin
  select exists (
	select 1 from public.reports
	where share_token = p_token
	  and status = 'ready'
  ) into v_exists;

  if v_exists then
	perform set_config('app.share_token', p_token::text, true);
  end if;

  return v_exists;
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function public.set_share_context(uuid) to anon, authenticated;

-- Revoke direct table access for anon (reads go through the RPC or service_role)
-- authenticated users can still read their own rows via the existing owner policy.
revoke select on public.reports from anon;
