-- Report-only product cleanup: drop studio/subscription/chat tables no longer used by the app.

DROP TABLE IF EXISTS chat_bookmarks CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS studio_canvases CASCADE;
DROP TABLE IF EXISTS generated_assets CASCADE;
DROP TABLE IF EXISTS usage_counters CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

-- Legacy public sharing (routes removed in report-only refactor)
DROP POLICY IF EXISTS "reports_public_share_select" ON public.reports;
DROP FUNCTION IF EXISTS public.set_share_context(uuid);
DROP INDEX IF EXISTS public.reports_share_token_idx;
ALTER TABLE public.reports DROP COLUMN IF EXISTS share_token;