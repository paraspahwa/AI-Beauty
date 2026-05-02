-- ============================================================
-- StyleAI — Migration 0007 Canary Evaluation Harness
-- Adds:
--   • report_canary_metrics view — per-variant aggregate stats
--     derived from pipeline_meta JSONB stored in reports rows.
--   • get_canary_stats() RPC — returns summary rows for
--     admin monitoring dashboard.
-- ============================================================

-- ------------------------------------------------------------
-- View: report_canary_metrics
-- Each row is one pipeline stage+variant combination.
-- Aggregates: run count, degraded count, avg duration.
-- Only reads the pipeline_meta column; no PII exposed.
-- ------------------------------------------------------------
create or replace view public.report_canary_metrics as
select
  stage_row ->> 'stage'     as stage,
  stage_row ->> 'variantId' as variant_id,
  count(*)::int             as run_count,
  sum(case when (stage_row ->> 'degraded')::boolean then 1 else 0 end)::int as degraded_count,
  round(avg((stage_row ->> 'durationMs')::numeric))::int as avg_duration_ms
from
  public.reports r,
  jsonb_array_elements(
    coalesce(r.pipeline_meta -> 'stages', '[]'::jsonb)
  ) as stage_row
where
  r.status = 'ready'
  and r.pipeline_meta is not null
  and stage_row ->> 'variantId' is not null
group by 1, 2
order by 1, 2;

-- Only service_role and admin can query this view (no RLS needed on views)
revoke all on public.report_canary_metrics from public;
grant  select on public.report_canary_metrics to service_role;

-- ------------------------------------------------------------
-- RPC: get_canary_stats
-- Returns the view contents. Called by /api/admin/canary-stats.
-- ------------------------------------------------------------
create or replace function public.get_canary_stats()
returns table (
  stage          text,
  variant_id     text,
  run_count      int,
  degraded_count int,
  avg_duration_ms int,
  degradation_pct numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    stage,
    variant_id,
    run_count,
    degraded_count,
    avg_duration_ms,
    round(
      case when run_count > 0 then (degraded_count::numeric / run_count) * 100 else 0 end,
      1
    ) as degradation_pct
  from public.report_canary_metrics
  order by stage, variant_id;
$$;

revoke execute on function public.get_canary_stats() from public;
grant  execute on function public.get_canary_stats() to service_role;
