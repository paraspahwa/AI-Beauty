import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { ensureReportInfographicsQueued } from "@/lib/ai/ensure-infographics";
import type { InfographicReportRow } from "@/lib/ai/run-analysis-infographics";

export const runtime = "nodejs";
export const maxDuration = 15;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/reports/[id]/ensure-infographics
 * Idempotent client/server trigger when infographics are missing or failed.
 * Fires one background job per section (never blocks on FAL).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    env.assertServer();
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from("reports")
      .select(
        "id, user_id, status, is_paid, image_path, face_shape, features, skin_analysis, hairstyle, glasses, color_analysis, visual_assets",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.status !== "ready") {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_ready" });
    }

    const reportRow = row as InfographicReportRow;
    const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });

    const result = ensureReportInfographicsQueued(id, reportRow, hasPremium);

    console.info(`[ensure-infographics] report=${id} mode=${result.mode} queued=${result.queued}`, result.sections ?? "");

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[POST /api/reports/[id]/ensure-infographics]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
