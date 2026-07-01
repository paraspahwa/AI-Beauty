import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess, hasStyleGuideAccess } from "@/lib/auth/access";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  previewSummaryForUnpaid,
  redactColorAnalysisForPreview,
  resolveReportVisualAssets,
} from "@/lib/report-access";
import { isReportSelfiePath } from "@/lib/vault/vault-item-id";
import { extractFaceLandmarks } from "@/lib/ai/landmarks";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import { fetchOwnedReportRow } from "@/lib/reports/fetch-report-row";
import type { CompiledReport } from "@/types/report";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/reports/[id]
 * Returns the compiled report. Locked sections are stripped if not paid.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, max-age=10" } });
  }

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const row = await fetchOwnedReportRow(admin, id, user.id);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, max-age=10" } });
  }

  let imageUrl = "";
  if (isReportSelfiePath(row.image_path, user.id, row.id)) {
    const { data: signed } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(row.image_path, 60 * 30);
    imageUrl = signed?.signedUrl ?? "";
  }

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const hasStyleGuide = hasStyleGuideAccess({
    isStyleGuidePaid: !!row.is_style_guide_paid,
    userEmail: user.email,
  });
  const visualAssets = await resolveReportVisualAssets(
    row as Record<string, unknown>,
    id,
    admin,
    hasPremium,
    hasStyleGuide,
  );

  let pipelineMeta = (row.pipeline_meta as CompiledReport["pipelineMeta"]) ?? undefined;
  if (!pipelineMeta) {
    const { data: metaRec } = await admin
      .from("recommendations")
      .select("data")
      .eq("report_id", id)
      .eq("category", "pipeline_meta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (metaRec?.data && typeof metaRec.data === "object") {
      pipelineMeta = metaRec.data as CompiledReport["pipelineMeta"];
    }
  }

  const report: CompiledReport = {
    id: row.id,
    userId: row.user_id,
    imageUrl,
    status: row.status as CompiledReport["status"],
    isPaid: hasPremium,
    isStyleGuidePaid: hasStyleGuide,
    bodyImageUploaded: !!row.body_image_path,
    detectedGender: normalizeRekognitionGender(row.rekognition),
    faceShape: (row.face_shape as CompiledReport["faceShape"]) ?? undefined,
    colorAnalysis: hasPremium
      ? (row.color_analysis as CompiledReport["colorAnalysis"]) ?? undefined
      : redactColorAnalysisForPreview(row.color_analysis as CompiledReport["colorAnalysis"]),
    skinAnalysis: hasPremium ? (row.skin_analysis as CompiledReport["skinAnalysis"]) ?? undefined : undefined,
    features: hasPremium ? (row.features as CompiledReport["features"]) ?? undefined : undefined,
    glasses: hasPremium ? (row.glasses as CompiledReport["glasses"]) ?? undefined : undefined,
    hairstyle: hasPremium ? (row.hairstyle as CompiledReport["hairstyle"]) ?? undefined : undefined,
    styleGuide: hasStyleGuide ? (row.style_guide as CompiledReport["styleGuide"]) ?? undefined : undefined,
    visualAssets,
    summary: hasPremium ? row.summary ?? undefined : previewSummaryForUnpaid(row.summary),
    pipelineMeta,
    faceLandmarks: extractFaceLandmarks(row.rekognition) ?? undefined,
    createdAt: row.created_at,
  };

  return NextResponse.json(report);
}
