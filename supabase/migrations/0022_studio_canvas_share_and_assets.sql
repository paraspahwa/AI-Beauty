-- ============================================================
-- Renovaara — Migration 0022
-- Studio Canvas: share links + canvas-owned generated assets
-- ============================================================

-- Add a public share token to studio_canvases so canvas sessions can be shared
alter table public.studio_canvases
  add column if not exists share_token uuid;

create unique index if not exists studio_canvases_share_token_idx
  on public.studio_canvases (share_token)
  where share_token is not null;

-- generated_assets currently assumes report_id; canvas try-ons need to persist
-- without a report row, so allow report_id to be nullable and enforce that at
-- least one context reference exists.
alter table public.generated_assets
  alter column report_id drop not null;

alter table public.generated_assets
  drop constraint if exists generated_assets_context_check;

alter table public.generated_assets
  add constraint generated_assets_context_check
  check (report_id is not null or studio_canvas_id is not null);

-- Outfit generator assets should also be tracked in the same vault.
alter table public.generated_assets
  drop constraint if exists generated_assets_tool_check;

alter table public.generated_assets
  add constraint generated_assets_tool_check
  check (tool in ('virtual_tryon', 'makeup', 'hair', 'outfit'));
