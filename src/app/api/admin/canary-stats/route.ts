import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminUserEmail } from "@/lib/auth/access";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/admin/canary-stats
 * Admin-only endpoint that returns per-stage per-variant aggregate metrics
 * for monitoring prompt canary A/B test outcomes.
 *
 * Response shape:
 * [
 *   { stage, variantId, runCount, degradedCount, avgDurationMs, degradationPct },
 *   ...
 * ]
 *
 * Access: restricted to users in ADMIN_EMAIL_ALLOWLIST.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUserEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("get_canary_stats");
  if (error) {
    console.error("[GET /api/admin/canary-stats]", error);
    return NextResponse.json({ error: "Failed to fetch canary stats" }, { status: 500 });
  }

  // Normalize snake_case DB columns to camelCase for the client
  const rows = (data ?? []).map((row: {
    stage: string;
    variant_id: string;
    run_count: number;
    degraded_count: number;
    avg_duration_ms: number;
    degradation_pct: number;
  }) => ({
    stage: row.stage,
    variantId: row.variant_id,
    runCount: row.run_count,
    degradedCount: row.degraded_count,
    avgDurationMs: row.avg_duration_ms,
    degradationPct: row.degradation_pct,
  }));

  return NextResponse.json(rows);
}
