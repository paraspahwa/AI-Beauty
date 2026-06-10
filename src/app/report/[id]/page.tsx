import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import {
  enrichReportStudioEntitlement,
  getStudioEntitlement,
  redactColorAnalysisForPreview,
} from "@/lib/entitlement";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import { ReportLayout } from "@/components/report/ReportLayout";
import type { CompiledReport, ReportVisualAssets } from "@/types/report";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type ReportTab = "about-you" | "your-look" | "try-shop" | "face" | "skin" | "glasses" | "hair" | "studio" | "shop";
const REPORT_TABS: readonly ReportTab[] = ["about-you", "your-look", "try-shop", "face", "skin", "glasses", "hair", "studio", "shop"] as const;

function parsePaywallPlan(value: string | string[] | undefined): "report" | "studio_pro" {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "studio_pro" ? "studio_pro" : "report";
}

function parseAppReturnUrl(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (["renovaara:", "exp:", "exps:"].includes(parsed.protocol)) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Beauty Report — Renovaara" };
}

function parseVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

async function resolveVisualAssets(
  row: Record<string, unknown>,
  reportId: string,
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<ReportVisualAssets | undefined> {
  const direct = parseVisualAssets(row.visual_assets);
  let visualAssets = direct;

  if (!visualAssets) {
    const { data: rec } = await admin
      .from("recommendations")
      .select("data")
      .eq("report_id", reportId)
      .eq("category", "visual_assets")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    visualAssets = parseVisualAssets(rec?.data);
  }

  if (!visualAssets) return undefined;

  // Guard against malformed JSONB where assets could be null/undefined
  const safeAssets = visualAssets.assets ?? ({} as typeof visualAssets.assets);

  const out: ReportVisualAssets = {
    ...visualAssets,
    assets: {
      ...safeAssets,
      landmarkOverlay: safeAssets.landmarkOverlay
        ? { ...safeAssets.landmarkOverlay }
        : undefined,
      paletteBoard: safeAssets.paletteBoard
        ? { ...safeAssets.paletteBoard }
        : undefined,
      glassesPreviews: safeAssets.glassesPreviews
        ? [...safeAssets.glassesPreviews]
        : undefined,
      hairstylePreviews: safeAssets.hairstylePreviews
        ? [...safeAssets.hairstylePreviews]
        : undefined,
      colorSwatchPreviews: safeAssets.colorSwatchPreviews
        ? [...safeAssets.colorSwatchPreviews]
        : undefined,
      makeupPreviews: safeAssets.makeupPreviews
        ? [...safeAssets.makeupPreviews]
        : undefined,
    },
  };

  if (out.assets.landmarkOverlay?.path && out.assets.landmarkOverlay.status === "ready") {
    const { data } = await admin.storage.from(out.bucket).createSignedUrl(out.assets.landmarkOverlay.path, 60 * 30);
    out.assets.landmarkOverlay.signedUrl = data?.signedUrl;
  }

  if (out.assets.paletteBoard?.path && out.assets.paletteBoard.status === "ready") {
    const { data } = await admin.storage.from(out.bucket).createSignedUrl(out.assets.paletteBoard.path, 60 * 30);
    out.assets.paletteBoard.signedUrl = data?.signedUrl;
  }

  if (out.assets.glassesPreviews) {
    out.assets.glassesPreviews = await Promise.all(
      out.assets.glassesPreviews.map(async (asset) => {
        if (asset.path && asset.status === "ready") {
          const { data } = await admin.storage.from(out.bucket).createSignedUrl(asset.path, 60 * 30);
          return { ...asset, signedUrl: data?.signedUrl };
        }
        return asset;
      }),
    );
  }

  if (out.assets.hairstylePreviews) {
    out.assets.hairstylePreviews = await Promise.all(
      out.assets.hairstylePreviews.map(async (asset) => {
        if (asset.path && asset.status === "ready") {
          const { data } = await admin.storage.from(out.bucket).createSignedUrl(asset.path, 60 * 30);
          return { ...asset, signedUrl: data?.signedUrl };
        }
        return asset;
      }),
    );
  }

  if (out.assets.colorSwatchPreviews) {
    out.assets.colorSwatchPreviews = await Promise.all(
      out.assets.colorSwatchPreviews.map(async (asset) => {
        if (asset.path && asset.status === "ready") {
          const { data } = await admin.storage.from(out.bucket).createSignedUrl(asset.path, 60 * 30);
          return { ...asset, signedUrl: data?.signedUrl };
        }
        return asset;
      }),
    );
  }

  if (out.assets.makeupPreviews) {
    out.assets.makeupPreviews = await Promise.all(
      out.assets.makeupPreviews.map(async (asset) => {
        if (asset.path && asset.status === "ready") {
          const { data } = await admin.storage.from(out.bucket).createSignedUrl(asset.path, 60 * 30);
          return { ...asset, signedUrl: data?.signedUrl };
        }
        return asset;
      }),
    );
  }

  return out;
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; sourceAssetId?: string | string[]; appReturnTo?: string | string[]; paywall?: string | string[]; plan?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const sourceParam = Array.isArray(query.sourceAssetId) ? query.sourceAssetId[0] : query.sourceAssetId;
  const appReturnToUrl = parseAppReturnUrl(query.appReturnTo);
  const initialPaywallOpen = (Array.isArray(query.paywall) ? query.paywall[0] : query.paywall) === "open";
  const initialPaywallPlan = parsePaywallPlan(query.plan);
  const initialSourceAssetId = sourceParam && UUID_RE.test(sourceParam) ? sourceParam : null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/report/${id}`);

  const admin = createSupabaseAdminClient();

  // Batch report fetch and entitlement lookup (store signing needs row.image_path)
  const [{ data: row }, baseEntitlement] = await Promise.all([
    supabase
      .from("reports")
      .select("id, user_id, status, is_paid, image_path, share_token, face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, rekognition, summary, visual_assets, pipeline_meta, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    getStudioEntitlement(user.id),
  ]);

  if (!row) notFound();

  // Sign image URL now that we have row.image_path
  const { data: signed, error: signErr } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  if (signErr) {
    console.warn("[report/page] Failed to generate signed URL for", row.image_path, signErr.message);
  }

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const effectivePremium = hasPremium || baseEntitlement.tier === "studio_pro";
  const studioEntitlement = await enrichReportStudioEntitlement(
    admin,
    user.id,
    id,
    !!row.is_paid,
    baseEntitlement,
  );
  const initialTab: ReportTab = tabParam && REPORT_TABS.includes(tabParam as ReportTab)
    ? (tabParam as ReportTab)
    : "try-shop";

  let visualAssets: Awaited<ReturnType<typeof resolveVisualAssets>> = undefined;
  try {
    visualAssets = await resolveVisualAssets(row as Record<string, unknown>, id, admin);
  } catch (vaErr) {
    console.warn("[report/page] resolveVisualAssets failed — rendering without visuals:", (vaErr as Error).message);
  }

  // Resolve pipeline_meta: prefer direct column, fall back to recommendations row
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
    isPaid: effectivePremium,
    detectedGender: normalizeRekognitionGender(row.rekognition),
    studioEntitlement,
    shareToken: (row as Record<string, unknown>).share_token as string | null ?? null,
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: effectivePremium
      ? row.color_analysis ?? undefined
      : redactColorAnalysisForPreview(row.color_analysis),
    skinAnalysis: effectivePremium ? row.skin_analysis ?? undefined : undefined,
    features:     effectivePremium ? row.features      ?? undefined : undefined,
    glasses:      effectivePremium ? row.glasses       ?? undefined : undefined,
    hairstyle:    effectivePremium ? row.hairstyle     ?? undefined : undefined,
    visualAssets,
    summary: effectivePremium
      ? row.summary ?? undefined
      : typeof row.summary === "string"
        ? row.summary.slice(0, 280) + (row.summary.length > 280 ? "…" : "")
        : undefined,
    pipelineMeta,
    createdAt:    row.created_at,
  };

  return (
    <ReportLayout
      report={report}
      initialTab={initialTab}
      initialStudioSourceAssetId={initialSourceAssetId}
      appReturnToUrl={appReturnToUrl}
      initialPaywallOpen={initialPaywallOpen}
      initialPaywallPlan={initialPaywallPlan}
    />
  );
}
