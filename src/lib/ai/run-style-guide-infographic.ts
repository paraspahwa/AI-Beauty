import { env } from "@/lib/env";
import { generateStyleGuideInfographic } from "@/lib/ai/generate-style-guide-infographic";
import {
  ensureVisualAssetsShell,
  getStyleGuideInfographicAsset,
  setStyleGuideInfographicAsset,
  styleGuideInfographicStoragePath,
} from "@/lib/ai/analysis-infographics";
import { isReportBodyImagePath } from "@/lib/vault/vault-item-id";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  ReportVisualAssets,
  StyleGuideResult,
} from "@/types/report";
import type { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface StyleGuideReportRow {
  id: string;
  user_id: string;
  status: string;
  is_style_guide_paid: boolean;
  body_image_path: string | null;
  style_guide?: StyleGuideResult | null;
  face_shape?: FaceShapeResult | null;
  color_analysis?: ColorAnalysisResult | null;
  features?: FeatureBreakdown | null;
  summary?: string | null;
  visual_assets?: unknown;
}

export type StyleGuideInfographicResult = {
  status: string;
  skipped?: boolean;
  error?: string;
};

function parseVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

async function downloadBodyImage(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  imagePath: string,
  userId: string,
  reportId: string,
): Promise<Buffer> {
  if (!isReportBodyImagePath(imagePath, userId, reportId)) {
    throw new Error("Body image unavailable");
  }
  const { data: imgData, error: imgErr } = await admin.storage
    .from(env.supabase.bucket)
    .download(imagePath);
  if (imgErr || !imgData) {
    throw new Error("Body image unavailable");
  }
  return Buffer.from(await imgData.arrayBuffer());
}

export function styleGuideNeedsGeneration(
  row: StyleGuideReportRow,
  force?: boolean,
): boolean {
  if (!row.is_style_guide_paid || !row.body_image_path || !row.style_guide) return false;
  if (!row.face_shape || !row.color_analysis || !row.features) return false;

  const visualAssets = parseVisualAssets(row.visual_assets);
  const existing = getStyleGuideInfographicAsset(visualAssets);
  if (force) return true;
  return !existing || existing.status === "missing" || existing.status === "failed";
}

export async function runStyleGuideInfographic(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: StyleGuideReportRow,
  opts?: { force?: boolean },
): Promise<StyleGuideInfographicResult> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured");
  }
  if (row.status !== "ready") {
    throw new Error("Report is not ready yet");
  }
  if (!row.is_style_guide_paid) {
    throw new Error("Style Guide add-on not purchased");
  }
  if (!row.body_image_path) {
    return { status: "failed", error: "Full-body photo required" };
  }
  if (!row.style_guide || !row.face_shape || !row.color_analysis || !row.features) {
    return { status: "failed", error: "Style analysis data required" };
  }

  const force = opts?.force === true;
  let visualAssets = ensureVisualAssetsShell(
    parseVisualAssets(row.visual_assets),
    row.user_id,
    row.id,
    env.supabase.bucket,
  );

  const existing = getStyleGuideInfographicAsset(visualAssets);
  if (!force && existing?.status === "ready") {
    return { status: "ready", skipped: true };
  }
  if (!force && existing?.status === "pending") {
    return { status: "pending", skipped: true };
  }

  const storagePath = styleGuideInfographicStoragePath(row.user_id, row.id);

  visualAssets = setStyleGuideInfographicAsset(visualAssets, {
    path: storagePath,
    status: "pending",
    mime: "image/jpeg",
    error: null,
    styleName: "Style Guide",
  });

  await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", row.id);
  row.visual_assets = visualAssets;

  try {
    const imageBuffer = await downloadBodyImage(admin, row.body_image_path, row.user_id, row.id);
    const generated = await generateStyleGuideInfographic({
      imageBuffer,
      styleGuide: row.style_guide,
      colorAnalysis: row.color_analysis,
      faceShape: row.face_shape,
      features: row.features,
      summary: row.summary ?? undefined,
    });

    const { error: upErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(storagePath, generated.buffer, { contentType: "image/jpeg", upsert: true });

    if (upErr) throw new Error(upErr.message);

    visualAssets = setStyleGuideInfographicAsset(visualAssets, {
      path: storagePath,
      status: "ready",
      mime: "image/jpeg",
      error: null,
      styleName: `Style Guide (${generated.promptVersion})`,
      width: generated.width,
      height: generated.height,
    });

    await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", row.id);
    return { status: "ready" };
  } catch (err) {
    const message = (err as Error).message;
    visualAssets = setStyleGuideInfographicAsset(visualAssets, {
      path: storagePath,
      status: "failed",
      mime: "image/jpeg",
      error: message,
      styleName: "Style Guide",
    });
    await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", row.id);
    console.warn(`[style-guide-infographic] report ${row.id} failed:`, message);
    return { status: "failed", error: message };
  }
}
