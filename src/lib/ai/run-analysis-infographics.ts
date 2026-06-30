import { env } from "@/lib/env";
import { generateAnalysisInfographic } from "@/lib/ai/generate-analysis-infographic";
import {
  analysisInfographicStoragePath,
  ensureVisualAssetsShell,
  getAnalysisInfographicAsset,
  setAnalysisInfographicAsset,
} from "@/lib/ai/analysis-infographics";
import { getBlueprintSection } from "@/lib/ai/infographic-sections";
import type {
  AnalysisInfographicSectionId,
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  HairstyleResult,
  GlassesResult,
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
  rekognition?: unknown;
  face_shape?: FaceShapeResult | null;
  features?: FeatureBreakdown | null;
  hairstyle?: HairstyleResult | null;
  glasses?: GlassesResult | null;
  color_analysis?: ColorAnalysisResult | null;
  skin_analysis?: SkinAnalysisResult | null;
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
    case "faceFeaturesPreview":
      return row.face_shape ? null : "Face shape analysis required";
    case "faceFeatures":
      return row.face_shape && row.features ? null : "Face shape and features analysis required";
    case "skin":
      return row.skin_analysis ? null : "Skin analysis required";
    case "hairstyle":
      return row.face_shape && row.features && row.hairstyle
        ? null
        : "Hairstyle analysis required";
    case "spectacles":
      return row.face_shape && row.glasses ? null : "Spectacles analysis required";
    case "color":
      return row.color_analysis ? null : "Color analysis required";
    case "hairColor":
      return row.color_analysis && row.features && row.hairstyle
        ? null
        : "Color, feature, and hairstyle analysis required";
    default:
      return "Section not supported yet";
  }
}

async function downloadSelfie(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  imagePath: string,
): Promise<Buffer> {
  const { data: imgData, error: imgErr } = await admin.storage
    .from(env.supabase.bucket)
    .download(imagePath);
  if (imgErr || !imgData) {
    throw new Error("Image unavailable");
  }
  return Buffer.from(await imgData.arrayBuffer());
}

async function generateOneSection(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: InfographicReportRow,
  section: AnalysisInfographicSectionId,
  imageBuffer: Buffer,
  force: boolean,
): Promise<InfographicSectionResult> {
  const meta = getBlueprintSection(section);
  if (!meta?.generatable) {
    return { status: "unsupported", error: "Section not available yet" };
  }

  const dataErr = sectionDataReady(section, row);
  if (dataErr) {
    return { status: "failed", error: dataErr };
  }

  let visualAssets = ensureVisualAssetsShell(
    parseVisualAssets(row.visual_assets),
    row.user_id,
    row.id,
    env.supabase.bucket,
  );

  const existing = getAnalysisInfographicAsset(visualAssets, section);
  if (!force && existing?.status === "ready") {
    return { status: "ready", skipped: true };
  }
  if (!force && existing?.status === "pending") {
    return { status: "pending", skipped: true };
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
      rekognition: row.rekognition,
      faceShape: row.face_shape ?? undefined,
      features: row.features ?? undefined,
      hairstyle: row.hairstyle ?? undefined,
      glasses: row.glasses ?? undefined,
      colorAnalysis: row.color_analysis ?? undefined,
      skinAnalysis: row.skin_analysis ?? undefined,
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
    return { status: "ready" };
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
    return { status: "failed", error: message };
  }
}

/** Free-tier preview — runs after analyze, no payment required. */
export async function runFaceFeaturesPreviewInfographic(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: InfographicReportRow,
  opts?: { force?: boolean },
): Promise<InfographicSectionResult> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured");
  }
  if (row.status !== "ready") {
    throw new Error("Report is not ready yet");
  }

  const imageBuffer = await downloadSelfie(admin, row.image_path);
  return generateOneSection(admin, row, "faceFeaturesPreview", imageBuffer, opts?.force === true);
}

/** Paid-tier full face features infographic. */
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

  const imageBuffer = await downloadSelfie(admin, row.image_path);
  const force = opts?.force === true;
  const results: Record<string, InfographicSectionResult> = {};

  for (const section of sections) {
    results[section] = await generateOneSection(admin, row, section, imageBuffer, force);
  }

  return results;
}

export function sectionsNeedingGeneration(
  row: InfographicReportRow,
  force?: boolean,
): AnalysisInfographicSectionId[] {
  const visualAssets = parseVisualAssets(row.visual_assets);
  const paidSections: AnalysisInfographicSectionId[] = [
    "faceFeatures",
    "skin",
    "color",
    "hairstyle",
    "spectacles",
    "hairColor",
  ];

  return paidSections.filter((section) => {
    if (sectionDataReady(section, row)) return false;
    const existing = getAnalysisInfographicAsset(visualAssets, section);
    if (force) return true;
    return !existing || existing.status === "missing" || existing.status === "failed";
  });
}

export function previewNeedsGeneration(row: InfographicReportRow, force?: boolean): boolean {
  if (sectionDataReady("faceFeaturesPreview", row)) return false;
  const visualAssets = parseVisualAssets(row.visual_assets);
  const existing = getAnalysisInfographicAsset(visualAssets, "faceFeaturesPreview");
  if (force) return true;
  return !existing || existing.status === "missing" || existing.status === "failed";
}
