import { env } from "@/lib/env";
import { generateAnalysisInfographic } from "@/lib/ai/generate-analysis-infographic";
import {
  analysisInfographicStoragePath,
  ensureVisualAssetsShell,
  getAnalysisInfographicAsset,
  setAnalysisInfographicAsset,
} from "@/lib/ai/analysis-infographics";
import { BLUEPRINT_SECTIONS, getGeneratableSectionIds } from "@/lib/ai/infographic-sections";
import type {
  AnalysisInfographicSectionId,
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  ReportVisualAssets,
  SkinAnalysisResult,
} from "@/types/report";
import type { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface InfographicReportRow {
  id: string;
  user_id: string;
  status: string;
  is_paid: boolean;
  image_path: string;
  face_shape?: FaceShapeResult | null;
  features?: FeatureBreakdown | null;
  skin_analysis?: SkinAnalysisResult | null;
  color_analysis?: ColorAnalysisResult | null;
  hairstyle?: HairstyleResult | null;
  glasses?: GlassesResult | null;
  summary?: string | null;
  visual_assets?: unknown;
}

export type InfographicSectionResult = {
  status: string;
  skipped?: boolean;
  error?: string;
};

function parseVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

function sectionDataReady(section: AnalysisInfographicSectionId, row: InfographicReportRow): string | null {
  switch (section) {
    case "faceFeatures":
      return row.face_shape && row.features ? null : "Face shape and features analysis required";
    case "skin":
      return row.skin_analysis ? null : "Skin analysis required";
    case "color":
      return row.color_analysis ? null : "Color analysis required";
    case "hairstyle":
      return row.face_shape && row.features && row.hairstyle
        ? null
        : "Hairstyle analysis required";
    case "spectacles":
      return row.face_shape && row.glasses ? null : "Spectacles analysis required";
    case "hairColor":
      return row.color_analysis && row.features && row.hairstyle
        ? null
        : "Color, feature, and hairstyle analysis required";
    case "styleGuide":
      return row.color_analysis && row.face_shape && row.features
        ? null
        : "Color, face shape, and feature analysis required";
    default:
      return "Section not supported";
  }
}

/**
 * Generate one or more Beauty Blueprint infographic sections for a paid report.
 */
export async function runAnalysisInfographics(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: InfographicReportRow,
  sections: AnalysisInfographicSectionId[],
  opts?: { force?: boolean },
): Promise<Record<string, InfographicSectionResult>> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured");
  }
  if (row.status !== "ready") {
    throw new Error("Report is not ready yet");
  }
  if (!row.is_paid) {
    throw new Error("Report must be unlocked");
  }

  const { data: imgData, error: imgErr } = await admin.storage
    .from(env.supabase.bucket)
    .download(row.image_path);
  if (imgErr || !imgData) {
    throw new Error("Image unavailable");
  }
  const imageBuffer = Buffer.from(await imgData.arrayBuffer());
  const force = opts?.force === true;
  const results: Record<string, InfographicSectionResult> = {};

  for (const section of sections) {
    const meta = BLUEPRINT_SECTIONS.find((s) => s.id === section);
    if (!meta?.generatable) {
      results[section] = { status: "unsupported", error: "Section not available yet" };
      continue;
    }

    const dataErr = sectionDataReady(section, row);
    if (dataErr) {
      results[section] = { status: "failed", error: dataErr };
      continue;
    }

    let visualAssets = ensureVisualAssetsShell(
      parseVisualAssets(row.visual_assets),
      row.user_id,
      row.id,
      env.supabase.bucket,
    );

    const existing = getAnalysisInfographicAsset(visualAssets, section);
    if (!force && existing?.status === "ready") {
      results[section] = { status: "ready", skipped: true };
      continue;
    }
    if (!force && existing?.status === "pending") {
      results[section] = { status: "pending", skipped: true };
      continue;
    }

    const storagePath = analysisInfographicStoragePath(row.user_id, row.id, section);

    visualAssets = setAnalysisInfographicAsset(visualAssets, section, {
      path: storagePath,
      status: "pending",
      mime: "image/jpeg",
      error: null,
      styleName: meta.label,
    });

    await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", row.id);
    row.visual_assets = visualAssets;

    try {
      const generated = await generateAnalysisInfographic({
        section,
        imageBuffer,
        faceShape: row.face_shape ?? undefined,
        features: row.features ?? undefined,
        skinAnalysis: row.skin_analysis ?? undefined,
        colorAnalysis: row.color_analysis ?? undefined,
        hairstyle: row.hairstyle ?? undefined,
        glasses: row.glasses ?? undefined,
        summary: row.summary ?? undefined,
      });

      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(storagePath, generated.buffer, { contentType: "image/jpeg", upsert: true });

      if (upErr) throw new Error(upErr.message);

      visualAssets = setAnalysisInfographicAsset(visualAssets, section, {
        path: storagePath,
        status: "ready",
        mime: "image/jpeg",
        error: null,
        styleName: `${meta.label} (${generated.promptVersion})`,
        width: generated.width,
        height: generated.height,
      });

      await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", row.id);
      row.visual_assets = visualAssets;
      results[section] = { status: "ready" };
    } catch (err) {
      const message = (err as Error).message;
      visualAssets = setAnalysisInfographicAsset(visualAssets, section, {
        path: storagePath,
        status: "failed",
        mime: "image/jpeg",
        error: message,
        styleName: meta.label,
      });
      await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", row.id);
      row.visual_assets = visualAssets;
      results[section] = { status: "failed", error: message };
    }
  }

  return results;
}

/** Sections that are enabled and not yet ready (for background queue). */
export function sectionsNeedingGeneration(
  row: InfographicReportRow,
  force?: boolean,
): AnalysisInfographicSectionId[] {
  const visualAssets = parseVisualAssets(row.visual_assets);
  return getGeneratableSectionIds().filter((section) => {
    if (sectionDataReady(section, row)) return false;
    const existing = getAnalysisInfographicAsset(visualAssets, section);
    if (force) return true;
    return !existing || existing.status === "missing" || existing.status === "failed";
  });
}
