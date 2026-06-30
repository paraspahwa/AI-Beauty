import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { kickOffInfographicSectionInBackground } from "@/lib/ai/kickoff-infographics";
import { isAnalysisInfographicSectionId } from "@/lib/ai/infographic-sections";
import { getAnalysisInfographicAsset } from "@/lib/ai/analysis-infographics";
import type { ReportVisualAssets } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 15;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z.object({
  section: z.string(),
});

/**
 * POST /api/reports/[id]/retry-infographic
 * Re-fire generation for a failed or missing paid infographic section.
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

    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!isAnalysisInfographicSectionId(body.section) || body.section === "faceFeaturesPreview") {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: report } = await admin
      .from("reports")
      .select("id,is_paid,visual_assets")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!report.is_paid) {
      return NextResponse.json({ error: "Report not unlocked" }, { status: 403 });
    }

    const visualAssets = report.visual_assets as ReportVisualAssets | null;
    const asset = getAnalysisInfographicAsset(visualAssets ?? undefined, body.section);
    if (asset?.status === "ready") {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_ready" });
    }

    kickOffInfographicSectionInBackground(id, body.section, true);
    return NextResponse.json({ ok: true, retrying: true, section: body.section });
  } catch (err) {
    console.error("[POST /api/reports/[id]/retry-infographic]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
