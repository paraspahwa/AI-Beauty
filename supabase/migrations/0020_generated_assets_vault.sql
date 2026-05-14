-- ============================================================
-- Renovaara — Migration 0020
-- Adds generated assets vault + provenance chain for image reuse
-- ============================================================

create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  source_asset_id uuid null references public.generated_assets(id) on delete set null,
  source_image_path text not null,
  result_image_path text not null unique,
  bucket text not null default 'selfies',
  tool text not null check (tool in ('virtual_tryon', 'makeup', 'hair')),
  variant text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists generated_assets_user_created_idx
  on public.generated_assets (user_id, created_at desc, id desc);

create index if not exists generated_assets_report_created_idx
  on public.generated_assets (report_id, created_at desc, id desc);

create index if not exists generated_assets_source_idx
  on public.generated_assets (source_asset_id);

alter table public.generated_assets enable row level security;

do $$ begin
  create policy "generated_assets_owner_select"
    on public.generated_assets for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "generated_assets_owner_insert"
    on public.generated_assets for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
