import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { kickOffStyleGuideInfographicInBackground } from "@/lib/ai/kickoff-infographics";

export const runtime = "nodejs";
export const maxDuration = 15;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/reports/[id]/retry-style-guide
 * Re-fire Style Guide infographic generation.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    env.assertServer();
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await getRequestUser(_req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: report } = await admin
      .from("reports")
      .select("id,is_style_guide_paid,body_image_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!report.is_style_guide_paid) {
      return NextResponse.json({ error: "Style Guide not purchased" }, { status: 403 });
    }
    if (!report.body_image_path) {
      return NextResponse.json({ error: "Full-body photo required" }, { status: 400 });
    }

    kickOffStyleGuideInfographicInBackground(id, true);
    return NextResponse.json({ ok: true, retrying: true });
  } catch (err) {
    console.error("[POST /api/reports/[id]/retry-style-guide]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
