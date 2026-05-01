-- ============================================================
-- StyleAI — Migration 0004 Visual Assets
-- Adds:
--   • reports.visual_assets jsonb to store generated visual output metadata
-- ============================================================

do $$ begin
  alter table public.reports
    add column visual_assets jsonb;
exception when duplicate_column then null;
end $$;
