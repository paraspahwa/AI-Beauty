-- ============================================================
-- StyleAI — Initial schema
-- Run inside Supabase SQL editor, or via `supabase db push`.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text unique,
  full_name       text,
  avatar_url      text,
  is_paid         boolean      not null default false,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

-- ------------------------------------------------------------
-- reports — one row per analysis run
-- ------------------------------------------------------------
create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  image_path      text not null,                    -- path inside storage bucket
  status          text not null default 'pending',  -- pending | processing | ready | failed
  is_paid         boolean not null default false,   -- has user paid for this report
  rekognition     jsonb,                            -- raw face landmarks
  face_shape      jsonb,                            -- { shape, traits[], confidence }
  color_analysis  jsonb,                            -- { season, undertone, palette[], metals[] }
  skin_analysis   jsonb,                            -- { type, zones, routine[] }
  features        jsonb,                            -- { eyes, nose, lips, cheeks }
  glasses         jsonb,                            -- { goals[], styles[], avoid[], colors[] }
  hairstyle       jsonb,                            -- { styles[], lengths[], colors[] }
  summary         text,                             -- compiled markdown / plain text
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists reports_user_id_idx on public.reports(user_id);
create index if not exists reports_status_idx  on public.reports(status);

-- ------------------------------------------------------------
-- recommendations — flattened items for sharing / search
-- ------------------------------------------------------------
create table if not exists public.recommendations (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  category    text not null,             -- color | glasses | hair | skin
  title       text not null,
  description text,
  data        jsonb,
  rank        int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists recs_report_idx on public.recommendations(report_id);

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  report_id           uuid references public.reports(id) on delete set null,
  provider            text not null default 'razorpay',
  provider_order_id   text not null,
  provider_payment_id text,
  provider_signature  text,
  amount              integer not null,
  currency            text not null default 'INR',
  status              text not null default 'created',
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists payments_provider_order_idx on public.payments(provider_order_id);
create index if not exists payments_user_idx on public.payments(user_id);

-- ------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_profiles_updated  on public.profiles;
drop trigger if exists trg_reports_updated   on public.reports;
drop trigger if exists trg_payments_updated  on public.payments;

create trigger trg_profiles_updated  before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_reports_updated   before update on public.reports  for each row execute function public.set_updated_at();
create trigger trg_payments_updated  before update on public.payments for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Auto-create profile on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.reports         enable row level security;
alter table public.recommendations enable row level security;
alter table public.payments        enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "reports_owner_select" on public.reports;
drop policy if exists "reports_owner_insert" on public.reports;
drop policy if exists "reports_owner_update" on public.reports;
create policy "reports_owner_select" on public.reports for select using (auth.uid() = user_id);
create policy "reports_owner_insert" on public.reports for insert with check (auth.uid() = user_id);
create policy "reports_owner_update" on public.reports for update using (auth.uid() = user_id);

drop policy if exists "recs_owner_select" on public.recommendations;
create policy "recs_owner_select" on public.recommendations for select using (
  exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid())
);

drop policy if exists "payments_owner_select" on public.payments;
create policy "payments_owner_select" on public.payments for select using (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for selfies
-- ============================================================
insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', false)
on conflict (id) do nothing;

drop policy if exists "selfies_owner_read"   on storage.objects;
drop policy if exists "selfies_owner_write"  on storage.objects;
drop policy if exists "selfies_owner_delete" on storage.objects;

create policy "selfies_owner_read"
  on storage.objects for select
  using (bucket_id = 'selfies' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "selfies_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'selfies' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "selfies_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'selfies' and auth.uid()::text = (storage.foldername(name))[1]);
