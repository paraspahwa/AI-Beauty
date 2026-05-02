import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminUserEmail } from "@/lib/auth/access";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/admin/cleanup
 * Admin-only: expires reports stuck in "processing" for longer than
 * the configured threshold (default 10 minutes).
 * Returns the number of reports marked failed.
 *
 * Can also be called by a Supabase Edge Function cron job using the
 * service_role key directly against expire_stuck_reports() RPC.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminUserEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { thresholdMinutes?: number };
  const thresholdMinutes = Math.max(1, Math.min(60, body.thresholdMinutes ?? 10));

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("expire_stuck_reports", {
    p_threshold_minutes: thresholdMinutes,
  });

  if (error) {
    console.error("[POST /api/admin/cleanup]", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }

  return NextResponse.json({ expired: data ?? 0, thresholdMinutes });
}
