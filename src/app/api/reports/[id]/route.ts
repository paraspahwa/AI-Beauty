import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import { extractFaceLandmarks } from "@/lib/ai/landmarks";
import type { CompiledReport, ReportVisualAssets } from "@/types/report";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


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

  const out: ReportVisualAssets = {
    ...visualAssets,
    assets: {
      ...visualAssets.assets,
      landmarkOverlay: visualAssets.assets.landmarkOverlay
        ? { ...visualAssets.assets.landmarkOverlay }
        : undefined,
      paletteBoard: visualAssets.assets.paletteBoard
        ? { ...visualAssets.assets.paletteBoard }
        : undefined,
      glassesPreviews: visualAssets.assets.glassesPreviews
        ? [...visualAssets.assets.glassesPreviews]
        : undefined,
      hairstylePreviews: visualAssets.assets.hairstylePreviews
        ? [...visualAssets.assets.hairstylePreviews]
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

  return out;
}

/**
 * GET /api/reports/[id]
 * Returns the compiled report. Locked sections are stripped if not paid.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("reports")
    .select("id, user_id, status, is_paid, image_path, share_token, face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, rekognition, summary, visual_assets, pipeline_meta, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sign a short-lived URL for the original image
  const admin = createSupabaseAdminClient();
  const { data: signed } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const visualAssets = await resolveVisualAssets(row as Record<string, unknown>, id, admin);

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
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: row.color_analysis ?? undefined,
    // Free preview shows ONLY face shape + color analysis
    skinAnalysis: hasPremium ? row.skin_analysis ?? undefined : undefined,
    features:     hasPremium ? row.features      ?? undefined : undefined,
    glasses:      hasPremium ? row.glasses       ?? undefined : undefined,
    hairstyle:    hasPremium ? row.hairstyle     ?? undefined : undefined,
    visualAssets,
    summary:      row.summary ?? undefined,
    pipelineMeta,
    faceLandmarks: extractFaceLandmarks(row.rekognition) ?? undefined,
    createdAt:    row.created_at,
  };

  return NextResponse.json(report);
}