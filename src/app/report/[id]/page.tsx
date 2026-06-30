import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess, hasStyleGuideAccess } from "@/lib/auth/access";
import {
  previewSummaryForUnpaid,
  redactColorAnalysisForPreview,
  resolveReportVisualAssets,
} from "@/lib/report-access";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import { ReportLayout } from "@/components/report/ReportLayout";
import type { CompiledReport } from "@/types/report";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Beauty Report — Renovaara" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paywall?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const initialPaywallOpen = (Array.isArray(query.paywall) ? query.paywall[0] : query.paywall) === "open";

  if (!UUID_RE.test(id)) {
    // #region agent log
    const { debugLog } = await import("@/lib/debug-log");
    debugLog("report/page.tsx", "invalid report id", { idLength: id.length }, "H1");
    // #endregion
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/report/${id}`);

  const admin = createSupabaseAdminClient();

  const { data: row } = await supabase
    .from("reports")
    .select(
      "id, user_id, status, is_paid, is_style_guide_paid, body_image_path, image_path, face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, style_guide, rekognition, summary, visual_assets, pipeline_meta, created_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!row) notFound();

  const { data: signed, error: signErr } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  if (signErr) {
    console.warn("[report/page] Failed to generate signed URL for", row.image_path, signErr.message);
  }

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const hasStyleGuide = hasStyleGuideAccess({
    isStyleGuidePaid: !!row.is_style_guide_paid,
    userEmail: user.email,
  });

  let visualAssets: Awaited<ReturnType<typeof resolveReportVisualAssets>> = undefined;
  try {
    visualAssets = await resolveReportVisualAssets(
      row as Record<string, unknown>,
      id,
      admin,
      hasPremium,
      hasStyleGuide,
    );
  } catch (vaErr) {
    console.warn("[report/page] resolveVisualAssets failed:", (vaErr as Error).message);
  }

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
    isStyleGuidePaid: hasStyleGuide,
    bodyImageUploaded: !!row.body_image_path,
    detectedGender: normalizeRekognitionGender(row.rekognition),
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: hasPremium
      ? row.color_analysis ?? undefined
      : redactColorAnalysisForPreview(row.color_analysis),
    skinAnalysis: hasPremium ? row.skin_analysis ?? undefined : undefined,
    features: hasPremium ? row.features ?? undefined : undefined,
    glasses: hasPremium ? row.glasses ?? undefined : undefined,
    hairstyle: hasPremium ? row.hairstyle ?? undefined : undefined,
    styleGuide: hasStyleGuide ? row.style_guide ?? undefined : undefined,
    visualAssets,
    summary: hasPremium ? row.summary ?? undefined : previewSummaryForUnpaid(row.summary),
    pipelineMeta,
    createdAt: row.created_at,
  };

  return <ReportLayout report={report} initialPaywallOpen={initialPaywallOpen} />;
}
