import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess, hasStyleGuideAccess, isAdminUserEmail } from "@/lib/auth/access";
import { isReportSelfiePath } from "@/lib/vault/vault-item-id";
import {
  previewSummaryForUnpaid,
  redactColorAnalysisForPreview,
  resolveReportVisualAssets,
} from "@/lib/report-access";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import { fetchOwnedReportRow } from "@/lib/reports/fetch-report-row";
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
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/report/${id}`);

  const admin = createSupabaseAdminClient();
  const row = await fetchOwnedReportRow(admin, id, user.id);

  if (!row) notFound();

  let imageUrl = "";
  if (isReportSelfiePath(row.image_path, user.id, row.id)) {
    const { data: signed, error: signErr } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(row.image_path, 60 * 30);

    if (signErr) {
      console.warn("[report/page] Failed to generate signed URL for", row.image_path, signErr.message);
    }
    imageUrl = signed?.signedUrl ?? "";
  }

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  // #region agent log
  fetch('http://127.0.0.1:7365/ingest/7666977d-9746-4afe-91bd-f61f1ea1abe3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dc1d3'},body:JSON.stringify({sessionId:'0dc1d3',runId:'post-fix',location:'report/[id]/page.tsx:hasPremium',message:'report page access',data:{reportId:id,dbIsPaid:!!row.is_paid,hasPremium,isAdmin:isAdminUserEmail(user.email),allowlistCount:env.auth.adminEmailAllowlist.length,internalSecretOk:(env.internal.secret?.length??0)>=16,falConfigured:env.fal.isConfigured},timestamp:Date.now(),hypothesisId:'H1-H2'})}).catch(()=>{});
  // #endregion
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
    createdAt: row.created_at,
  };

  return <ReportLayout report={report} initialPaywallOpen={initialPaywallOpen} />;
}
