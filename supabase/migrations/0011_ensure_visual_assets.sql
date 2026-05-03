-- ============================================================
-- StyleAI — Migration 0011: Ensure visual_assets column exists
--
-- Problem: 0004_visual_assets.sql was never applied to production,
-- so reports.visual_assets does not exist.  The visuals route throws
-- 42P01 (undefined relation) because PostgREST misinterprets a
-- missing column reference in the update payload.
--
-- Fix:
--   1. Add reports.visual_assets (idempotent — safe to re-run).
--   2. Add a unique constraint on recommendations(report_id, category)
--      so the fallback upsert in the visuals route works correctly.
--   3. Index visual_assets for quick NULL checks (idempotency guard).
-- ============================================================

-- 1. Add the column if it doesn't exist yet
do $$ begin
  alter table public.reports
	add column visual_assets jsonb;
exception when duplicate_column then null;
end $$;

-- 2. Index for fast IS NULL / IS NOT NULL checks in the visuals route
create index if not exists reports_visual_assets_null_idx
  on public.reports ((visual_assets is null))
  where visual_assets is null;

-- 3. Unique constraint on recommendations(report_id, category)
--    so the upsert fallback path works without duplicates.
--    Wrapped in a DO block so it is safe to re-run.
do $$ begin
  alter table public.recommendations
	add constraint recommendations_report_category_uq
	unique (report_id, category);
exception when duplicate_table then null;   -- constraint already exists
		 when others then null;
end $$;
