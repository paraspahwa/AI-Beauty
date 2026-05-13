-- ============================================================
-- Renovaara — Migration 0019
-- Adds:
--   • plan_tier enum
--   • plans reference table (seeded)
--   • subscriptions table (studio_pro recurring)
--   • usage_counters table (monthly AI generation metering)
--   • try_consume_generation RPC (atomic quota check + increment)
--   • get_user_plan_tier RPC
--   • get_studio_entitlement RPC
--   • RLS policies for all three new tables
-- ============================================================

-- ── Plan tier enum ────────────────────────────────────────────────────────────
do $$ begin
  create type public.plan_tier as enum ('free', 'report', 'studio_pro');
exception when duplicate_object then null;
end $$;

-- ── Plans reference table ─────────────────────────────────────────────────────
create table if not exists public.plans (
  id                text                    primary key,
  tier              public.plan_tier        not null,
  currency          text                    not null,
  amount_minor      int                     not null,   -- paise (INR) / cents (USD)
  interval          text,                               -- null = one-time | 'monthly' | 'yearly'
  razorpay_plan_id  text,                               -- set manually after Razorpay dashboard creation
  monthly_gen_cap   int,                                -- null = per-report; 150 for studio_pro
  active            bool                    not null    default true,
  created_at        timestamptz             not null    default now()
);

-- Seed
insert into public.plans (id, tier, currency, amount_minor, interval, monthly_gen_cap)
values
  ('report_inr_299',             'report',     'INR', 29900,  null,      5),
  ('report_usd_399',             'report',     'USD', 399,    null,      5),
  ('studio_pro_inr_999_monthly', 'studio_pro', 'INR', 99900,  'monthly', 150),
  ('studio_pro_usd_1299_monthly','studio_pro', 'USD', 1299,   'monthly', 150)
on conflict (id) do nothing;

-- ── Subscriptions ─────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid        primary key default gen_random_uuid(),
  user_id                   uuid        not null references public.profiles(id) on delete cascade,
  plan_id                   text        not null references public.plans(id),
  provider                  text        not null default 'razorpay',
  provider_subscription_id  text        unique,
  status                    text        not null default 'created',
  -- created | pending_activation | active | halted | cancelled | expired
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      bool        not null default false,
  cancelled_at              timestamptz,
  raw                       jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx     on public.subscriptions(user_id);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id, status);
create index if not exists subscriptions_provider_id_idx on public.subscriptions(provider_subscription_id);

-- ── Usage counters ────────────────────────────────────────────────────────────
-- One row per (user, month). Tracks AI generation count for studio_pro metering.
create table if not exists public.usage_counters (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  period_start   date not null,   -- first day of month  e.g. 2025-07-01
  ai_generations int  not null    default 0,
  primary key (user_id, period_start)
);

create index if not exists usage_counters_user_period_idx
  on public.usage_counters(user_id, period_start desc);

-- ── RPC: try_consume_generation ───────────────────────────────────────────────
-- Atomically increments the monthly generation counter.
-- Returns TRUE  → generation allowed (under cap).
-- Returns FALSE → quota exceeded; counter is NOT incremented.
create or replace function public.try_consume_generation(
  p_user uuid,
  p_cap  int
) returns boolean
language plpgsql
security definer
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_count  int;
begin
  insert into public.usage_counters (user_id, period_start, ai_generations)
  values (p_user, v_period, 1)
  on conflict (user_id, period_start)
	do update set ai_generations = public.usage_counters.ai_generations + 1
  returning ai_generations into v_count;

  if v_count > p_cap then
	-- Roll back — quota exceeded
	update public.usage_counters
	  set ai_generations = ai_generations - 1
	  where user_id = p_user and period_start = v_period;
	return false;
  end if;

  return true;
end;
$$;

-- ── RPC: get_user_plan_tier ───────────────────────────────────────────────────
-- Returns the effective plan tier for a user:
--   'studio_pro' if they have an active or pending_activation subscription
--   'report'     if profiles.is_paid = true (legacy one-time purchase)
--   'free'       otherwise
create or replace function public.get_user_plan_tier(p_user uuid)
returns text
language plpgsql
security definer
as $$
begin
  perform 1 from public.subscriptions
	where user_id = p_user
	  and status in ('active', 'pending_activation')
	limit 1;
  if found then return 'studio_pro'; end if;

  perform 1 from public.profiles
	where id = p_user and is_paid = true
	limit 1;
  if found then return 'report'; end if;

  return 'free';
end;
$$;

-- ── RPC: get_studio_entitlement ───────────────────────────────────────────────
-- Returns a jsonb object describing what the user can do in AI Studio:
--   tier, remaining_gens, used_gens, cap, period_resets, subscription_id
create or replace function public.get_studio_entitlement(p_user uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_tier        text;
  v_period      date        := date_trunc('month', now())::date;
  v_used        int         := 0;
  v_cap         int         := 150;
  v_period_end  timestamptz;
  v_sub_id      uuid;
begin
  v_tier := public.get_user_plan_tier(p_user);

  if v_tier = 'studio_pro' then
	select ai_generations into v_used
	  from public.usage_counters
	  where user_id = p_user and period_start = v_period;
	v_used := coalesce(v_used, 0);

	select current_period_end, id into v_period_end, v_sub_id
	  from public.subscriptions
	  where user_id  = p_user
		and status in ('active', 'pending_activation')
	  order by created_at desc
	  limit 1;

	return jsonb_build_object(
	  'tier',            v_tier,
	  'remaining_gens',  greatest(0, v_cap - v_used),
	  'used_gens',       v_used,
	  'cap',             v_cap,
	  'period_resets',   coalesce(v_period_end::text, (v_period + interval '1 month')::text),
	  'subscription_id', v_sub_id
	);
  end if;

  -- report / free: no monthly metering
  return jsonb_build_object(
	'tier',            v_tier,
	'remaining_gens',  null,
	'used_gens',       null,
	'cap',             null,
	'period_resets',   null,
	'subscription_id', null
  );
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.plans          enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.usage_counters enable row level security;

-- plans: all authenticated users can read
do $$ begin
  create policy "plans_select_authenticated"
	on public.plans for select
	using (auth.uid() is not null);
exception when duplicate_object then null;
end $$;

-- subscriptions: users see only their own
do $$ begin
  create policy "subscriptions_select_own"
	on public.subscriptions for select
	using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- usage_counters: users see only their own
do $$ begin
  create policy "usage_counters_select_own"
	on public.usage_counters for select
	using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
-- Service role bypasses RLS for all writes (insert/update from API routes).
