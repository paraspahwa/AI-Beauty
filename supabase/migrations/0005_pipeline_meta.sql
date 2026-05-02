-- ============================================================
-- StyleAI — Migration 0005 Pipeline Meta
-- Adds pipeline_meta jsonb column to reports for P1-3/P1-4:
--   • Stores blended confidence, GPT raw confidence, stage timings
--   • Nullable — existing rows will have NULL (resolved via recommendations fallback)
-- ============================================================

alter table public.reports
  add column if not exists pipeline_meta jsonb;

comment on column public.reports.pipeline_meta is
  'Diagnostic metadata from the analysis pipeline: stage timings, blended confidence, Rekognition availability.';
