-- ============================================================
-- Renovaara — Migration 0023
-- Adds identity-based rolling window rate limits:
--   • identity_window_counters table
--   • try_consume_window RPC (atomic window counter + cap enforcement)
--   • cleanup_identity_window_counters RPC
--   • optional pg_cron cleanup schedule (hourly)
-- ============================================================

create table if not exists public.identity_window_counters (
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  action          text        not null,
  window_seconds  int         not null check (window_seconds > 0 and window_seconds <= 86400),
  bucket_start    timestamptz not null,
  counter         int         not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (user_id, action, window_seconds, bucket_start)
);

create index if not exists identity_window_counters_user_action_idx
  on public.identity_window_counters(user_id, action, updated_at desc);

create or replace function public.try_consume_window(
  p_user uuid,
  p_action text,
  p_cap int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket_start timestamptz;
  v_count int;
begin
  if p_user is null or p_action is null or length(trim(p_action)) = 0 then
    return false;
  end if;

  if p_cap <= 0 then
    return false;
  end if;

  if p_window_seconds <= 0 or p_window_seconds > 86400 then
    return false;
  end if;

  v_bucket_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.identity_window_counters (
    user_id,
    action,
    window_seconds,
    bucket_start,
    counter,
    updated_at
  )
  values (
    p_user,
    trim(p_action),
    p_window_seconds,
    v_bucket_start,
    1,
    now()
  )
  on conflict (user_id, action, window_seconds, bucket_start)
  do update
    set counter = public.identity_window_counters.counter + 1,
        updated_at = now()
  returning counter into v_count;

  if v_count > p_cap then
    update public.identity_window_counters
      set counter = counter - 1,
          updated_at = now()
      where user_id = p_user
        and action = trim(p_action)
        and window_seconds = p_window_seconds
        and bucket_start = v_bucket_start;
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.cleanup_identity_window_counters(
  p_older_than interval default interval '2 days'
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted int := 0;
begin
  if p_older_than <= interval '0 seconds' then
    return 0;
  end if;

  delete from public.identity_window_counters
   where bucket_start < now() - p_older_than;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter table public.identity_window_counters enable row level security;

do $$ begin
  create policy "identity_window_counters_select_own"
    on public.identity_window_counters for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

revoke execute on function public.try_consume_window(uuid, text, int, int) from public;
revoke execute on function public.cleanup_identity_window_counters(interval) from public;
grant execute on function public.try_consume_window(uuid, text, int, int) to service_role;
grant execute on function public.cleanup_identity_window_counters(interval) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('cleanup-identity-window-counters');
  end if;
exception when others then
  null;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-identity-window-counters',
      '15 * * * *',
      $cron$select public.cleanup_identity_window_counters(interval '2 days')$cron$
    );
  end if;
exception when others then
  null;
end $$;
