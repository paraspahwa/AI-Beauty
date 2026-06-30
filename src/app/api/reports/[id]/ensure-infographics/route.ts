import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import {
  kickOffFaceFeaturesPreviewInBackground,
  kickOffInfographicsInBackground,
} from "@/lib/ai/kickoff-infographics";
import {
  previewNeedsGeneration,
  sectionsNeedingGeneration,
  type InfographicReportRow,
} from "@/lib/ai/run-analysis-infographics";

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
    let queued = 0;

    if (!row.is_paid) {
      if (previewNeedsGeneration(reportRow)) {
        kickOffFaceFeaturesPreviewInBackground(id);
        queued += 1;
      }
      return NextResponse.json({ ok: true, queued, mode: "preview" });
    }

    const sections = sectionsNeedingGeneration(reportRow);
    if (sections.length > 0) {
      kickOffInfographicsInBackground(id);
      queued = sections.length;
    }

    return NextResponse.json({ ok: true, queued, mode: "full", sections });
  } catch (err) {
    console.error("[POST /api/reports/[id]/ensure-infographics]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
