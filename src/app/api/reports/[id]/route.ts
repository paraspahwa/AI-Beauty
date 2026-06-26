import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  previewSummaryForUnpaid,
  redactColorAnalysisForPreview,
  resolveReportVisualAssets,
} from "@/lib/report-access";
import { extractFaceLandmarks } from "@/lib/ai/landmarks";
import { normalizeRekognitionGender } from "@/lib/hair-options";
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
  const { data: row, error } = await admin
    .from("reports")
    .select(
      "id, user_id, status, is_paid, image_path, face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, style_guide, rekognition, summary, visual_assets, pipeline_meta, created_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, max-age=10" } });
  }

  const { data: signed } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const visualAssets = await resolveReportVisualAssets(row as Record<string, unknown>, id, admin);

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
    imageUrl: signed?.signedUrl ?? "",
    status: row.status,
    isPaid: hasPremium,
    detectedGender: normalizeRekognitionGender(row.rekognition),
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: hasPremium
      ? row.color_analysis ?? undefined
      : redactColorAnalysisForPreview(row.color_analysis),
    skinAnalysis: hasPremium ? row.skin_analysis ?? undefined : undefined,
    features: hasPremium ? row.features ?? undefined : undefined,
    glasses: hasPremium ? row.glasses ?? undefined : undefined,
    hairstyle: hasPremium ? row.hairstyle ?? undefined : undefined,
    styleGuide: hasPremium ? row.style_guide ?? undefined : undefined,
    visualAssets,
    summary: hasPremium ? row.summary ?? undefined : previewSummaryForUnpaid(row.summary),
    pipelineMeta,
    faceLandmarks: extractFaceLandmarks(row.rekognition) ?? undefined,
    createdAt: row.created_at,
  };

  return NextResponse.json(report);
}
