import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import { ReportLayout } from "@/components/report/ReportLayout";
import type { CompiledReport, ReportVisualAssets } from "@/types/report";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("reports")
    .select("face_shape, color_analysis, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!row || row.status !== "ready") return { title: "Beauty Report — StyleAI" };

  const faceShape = (row.face_shape as { shape?: string } | null)?.shape;
  const season = (row.color_analysis as { season?: string } | null)?.season;
  const title = [faceShape ? `${faceShape} Face` : null, season ?? null]
    .filter(Boolean)
    .join(" · ") || "Beauty Report";

  return { title: `${title} — StyleAI` };
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

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/report/${id}`);

  const { data: row } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!row) notFound();

  const admin = createSupabaseAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  if (signErr) {
    console.warn("[report/page] Failed to generate signed URL for", row.image_path, signErr.message);
  }

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
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
    isPaid: hasPremium,
    shareToken: (row as Record<string, unknown>).share_token as string | null ?? null,
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: row.color_analysis ?? undefined,
    skinAnalysis: hasPremium ? row.skin_analysis ?? undefined : undefined,
    features:     hasPremium ? row.features      ?? undefined : undefined,
    glasses:      hasPremium ? row.glasses       ?? undefined : undefined,
    hairstyle:    hasPremium ? row.hairstyle     ?? undefined : undefined,
    visualAssets,
    summary:      row.summary ?? undefined,
    pipelineMeta,
    createdAt:    row.created_at,
  };

  return <ReportLayout report={report} />;
}
