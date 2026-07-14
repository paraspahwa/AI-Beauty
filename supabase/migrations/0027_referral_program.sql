-- ============================================================
-- Referral Program — viral loop
-- ============================================================

-- Add referral columns to profiles
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referral_credits integer not null default 0;

-- Unique referral codes
create unique index if not exists profiles_referral_code_idx on public.profiles(referral_code);

-- Referral redemptions
create table if not exists public.referral_redemptions (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references public.profiles(id) on delete cascade,
  referred_id     uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'pending',  -- pending | completed | expired
  report_id       uuid references public.reports(id) on delete set null,
  referrer_reward integer not null default 50,     -- credited to referrer (INR)
  referred_discount integer not null default 50,   -- discount for referred user (INR)
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  unique(referrer_id, referred_id)
);

-- Function to generate a unique referral code for a user
create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
$$;

-- Function to apply referral code on signup
create or replace function public.apply_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_credit integer;
begin
  -- Generate referral code for the new user
  new.referral_code := public.generate_referral_code();

  -- Check if there's a pending referral invitation
  select referred_by into v_referrer_id
  from profiles
  where referral_code = new.raw_user_meta_data->>'ref'
  limit 1;

  if v_referrer_id is not null and v_referrer_id != new.id then
    new.referred_by := v_referrer_id;

    -- Insert redemption record
    insert into public.referral_redemptions (referrer_id, referred_id)
    values (v_referrer_id, new.id);
  end if;

  return new;
end;
$$;

-- Trigger: generate referral code and apply referral on profile creation
drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  before insert on public.profiles
  for each row
  execute function public.apply_referral();

-- Function to complete a referral (called when referred user pays)
create or replace function public.complete_referral(p_referred_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption_id uuid;
  v_referrer_id uuid;
  v_referrer_reward integer;
  v_referred_discount integer;
begin
  select id, referrer_id, referrer_reward, referred_discount
  into v_redemption_id, v_referrer_id, v_referrer_reward, v_referred_discount
  from public.referral_redemptions
  where referred_id = p_referred_id and status = 'pending'
  order by created_at desc
  limit 1;

  if v_redemption_id is not null then
    -- Credit the referrer
    update public.profiles
    set referral_credits = referral_credits + v_referrer_reward
    where id = v_referrer_id;

    -- Mark redemption as completed
    update public.referral_redemptions
    set status = 'completed', completed_at = now()
    where id = v_redemption_id;
  end if;
end;
$$;

-- Enable RLS
alter table public.referral_redemptions enable row level security;

-- RLS: users can see their own referral redemptions
create policy "Users can view their own referrals"
  on public.referral_redemptions for select
  using (referrer_id = auth.uid() or referred_id = auth.uid());

-- RLS: service_role only for insert/update
create policy "Service role can manage referrals"
  on public.referral_redemptions for all
  to service_role
  using (true)
  with check (true);

-- Grant permissions
grant usage on schema public to service_role;
grant all on public.referral_redemptions to service_role;
grant select on public.referral_redemptions to authenticated;
