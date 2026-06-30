import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminUserEmail, hasPremiumAccess } from "@/lib/auth/access";
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
    const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
    let queued = 0;

    // #region agent log
    fetch('http://127.0.0.1:7365/ingest/7666977d-9746-4afe-91bd-f61f1ea1abe3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dc1d3'},body:JSON.stringify({sessionId:'0dc1d3',location:'ensure-infographics/route.ts:entry',message:'ensure-infographics decision',data:{reportId:id,dbIsPaid:!!row.is_paid,hasPremium,isAdmin:isAdminUserEmail(user.email),status:row.status},timestamp:Date.now(),hypothesisId:'H2-H5'})}).catch(()=>{});
    // #endregion

    if (!hasPremium) {
      if (previewNeedsGeneration(reportRow)) {
        kickOffFaceFeaturesPreviewInBackground(id);
        queued += 1;
      }
      // #region agent log
      fetch('http://127.0.0.1:7365/ingest/7666977d-9746-4afe-91bd-f61f1ea1abe3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dc1d3'},body:JSON.stringify({sessionId:'0dc1d3',runId:'post-fix',location:'ensure-infographics/route.ts:preview',message:'preview mode only',data:{reportId:id,queued,hasPremium},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      console.info(`[ensure-infographics] preview mode report=${id} queued=${queued}`);
      return NextResponse.json({ ok: true, queued, mode: "preview" });
    }

    const sections = sectionsNeedingGeneration(reportRow);
    if (sections.length > 0) {
      kickOffInfographicsInBackground(id);
      queued = sections.length;
    }

    // #region agent log
    fetch('http://127.0.0.1:7365/ingest/7666977d-9746-4afe-91bd-f61f1ea1abe3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dc1d3'},body:JSON.stringify({sessionId:'0dc1d3',runId:'post-fix',location:'ensure-infographics/route.ts:full',message:'full infographics queued',data:{reportId:id,queued,sections,hasPremium},timestamp:Date.now(),hypothesisId:'H2-H5'})}).catch(()=>{});
    // #endregion
    console.info(`[ensure-infographics] full mode report=${id} queued=${queued} sections=${sections.join(",")}`);

    return NextResponse.json({ ok: true, queued, mode: "full", sections });
  } catch (err) {
    console.error("[POST /api/reports/[id]/ensure-infographics]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
