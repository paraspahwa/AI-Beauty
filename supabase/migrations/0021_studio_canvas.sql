-- ============================================================
-- Renovaara — Migration 0021
-- Studio Canvas: Standalone try-on sessions without full report
-- ============================================================

-- Table: studio_canvases
-- Stores user-uploaded photos for virtual try-on sessions
create table if not exists public.studio_canvases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  selfie_path     text not null,                    -- storage path: selfies/canvases/{user_id}/*
  color_palette   jsonb,                            -- optional: { season?, colors[]? }
  created_at      timestamptz not null default now()
);

-- Index for user canvas listing
create index if not exists studio_canvases_user_created_idx
  on public.studio_canvases (user_id, created_at desc);

alter table public.studio_canvases enable row level security;

-- Canvas owner can only access their own
do $$ begin
  create policy "studio_canvases_owner_select"
    on public.studio_canvases for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "studio_canvases_owner_insert"
    on public.studio_canvases for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Update: generated_assets
-- Link to studio canvas (for canvas-only generations)
alter table public.generated_assets
  add column if not exists studio_canvas_id uuid references public.studio_canvases(id) on delete cascade;

-- Index for canvas asset lookup
create index if not exists generated_assets_canvas_idx
  on public.generated_assets (studio_canvas_id);

-- Comment: Either report_id OR studio_canvas_id will be set, never both
-- Free users: only studio_canvas_id (canvas mode)
-- Paid users: both (report + canvas modes)
comment on column public.generated_assets.studio_canvas_id is
  'Canvas session reference for non-report try-ons; mutually exclusive with report_id for quota tracking';
