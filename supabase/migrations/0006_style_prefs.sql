-- ============================================================
-- StyleAI — Migration 0006 Style Preferences Memory Loop
-- Adds:
--   • user_style_prefs table (one row per user)
--   • RLS policy: users can only read/write own row
--   • Helper RPC to upsert prefs (called by analyse route)
-- ============================================================

-- ------------------------------------------------------------
-- Table: user_style_prefs
-- Stores aggregated style preferences derived from completed
-- analyses. Updated via upsert_style_prefs() RPC.
-- ------------------------------------------------------------
create table if not exists public.user_style_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  color_season   text,
  undertone      text,
  face_shape     text,
  skin_type      text,
  prefs          jsonb not null default '{}',   -- arbitrary extras
  updated_at     timestamptz not null default now()
);

alter table public.user_style_prefs enable row level security;

-- Users can only access their own row
create policy "user_style_prefs_owner_select"
  on public.user_style_prefs for select
  using (auth.uid() = user_id);

create policy "user_style_prefs_owner_update"
  on public.user_style_prefs for update
  using (auth.uid() = user_id);

-- Service role can insert/update (used by the server-side RPC)
create policy "user_style_prefs_service_insert"
  on public.user_style_prefs for insert
  with check (true);

create policy "user_style_prefs_service_update_all"
  on public.user_style_prefs for update
  using (true);

-- ------------------------------------------------------------
-- RPC: upsert_style_prefs
-- Called by POST /api/analyze (server-side, service_role key)
-- to persist aggregated preferences after each analysis.
-- ------------------------------------------------------------
create or replace function public.upsert_style_prefs(
  p_user_id      uuid,
  p_color_season text,
  p_undertone    text,
  p_face_shape   text,
  p_skin_type    text,
  p_prefs        jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_style_prefs
    (user_id, color_season, undertone, face_shape, skin_type, prefs, updated_at)
  values
    (p_user_id, p_color_season, p_undertone, p_face_shape, p_skin_type, p_prefs, now())
  on conflict (user_id) do update set
    color_season = excluded.color_season,
    undertone    = excluded.undertone,
    face_shape   = excluded.face_shape,
    skin_type    = excluded.skin_type,
    prefs        = excluded.prefs,
    updated_at   = now();
end;
$$;

-- Only service_role / server should call this
revoke execute on function public.upsert_style_prefs from public;
grant  execute on function public.upsert_style_prefs to service_role;
