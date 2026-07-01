import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import { generateAnalysisInfographic } from "@/lib/ai/generate-analysis-infographic";
import {
  analysisInfographicStoragePath,
  ensureVisualAssetsShell,
  getAnalysisInfographicAsset,
  setAnalysisInfographicAsset,
} from "@/lib/ai/analysis-infographics";
import { getBlueprintSection } from "@/lib/ai/infographic-sections";
import { isVaultStoragePath } from "@/lib/vault/vault-item-id";
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
  if (!isVaultStoragePath(imagePath)) {
    throw new Error("Selfie image was removed");
  }
  const { data: imgData, error: imgErr } = await admin.storage
    .from(env.supabase.bucket)
    .download(imagePath);
  if (imgErr || !imgData) {
    throw new Error("Image unavailable");
  }
  return Buffer.from(await imgData.arrayBuffer());
}

async function claimSectionGeneration(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  reportId: string,
  userId: string,
  section: AnalysisInfographicSectionId,
  force: boolean,
): Promise<
  | { claimed: true; visualAssets: ReportVisualAssets; storagePath: string; label: string }
  | { claimed: false; status: string }
> {
  const { data: fresh } = await admin
    .from("reports")
    .select("visual_assets")
    .eq("id", reportId)
    .single();

  if (!fresh) return { claimed: false, status: "failed" };

  const meta = getBlueprintSection(section);
  if (!meta?.generatable) return { claimed: false, status: "unsupported" };

  let visualAssets = ensureVisualAssetsShell(
    parseVisualAssets(fresh.visual_assets),
    userId,
    reportId,
    env.supabase.bucket,
  );
  const existing = getAnalysisInfographicAsset(visualAssets, section);

  if (!force) {
    if (existing?.status === "ready" || existing?.status === "pending") {
      return { claimed: false, status: existing.status };
    }
  } else if (existing?.status === "pending") {
    return { claimed: false, status: "pending" };
  }

  const storagePath = analysisInfographicStoragePath(userId, reportId, section);
  visualAssets = setAnalysisInfographicAsset(visualAssets, section, {
    path: storagePath,
    status: "pending",
    mime: "image/png",
    error: null,
    styleName: meta.label,
  });

  const { error } = await admin
    .from("reports")
    .update({ visual_assets: visualAssets })
    .eq("id", reportId);

  if (error) return { claimed: false, status: "failed" };

  return { claimed: true, visualAssets, storagePath, label: meta.label };
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

  const claim = await claimSectionGeneration(admin, row.id, row.user_id, section, force);
  if (!claim.claimed) {
    return { status: claim.status, skipped: true };
  }

  let visualAssets = claim.visualAssets;
  const storagePath = claim.storagePath;
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
      .upload(storagePath, generated.buffer, { contentType: generated.mime, upsert: true });

    if (upErr) throw new Error(upErr.message);

    visualAssets = setAnalysisInfographicAsset(visualAssets, section, {
      path: storagePath,
      status: "ready",
      mime: generated.mime,
      error: null,
      styleName: `${claim.label} (${generated.promptVersion})`,
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
      mime: "image/png",
      error: message,
      styleName: claim.label,
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

/** Paid-tier: generate exactly one section (used by per-section background jobs). */
export async function runSinglePaidInfographic(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: InfographicReportRow,
  section: AnalysisInfographicSectionId,
  opts?: { force?: boolean; userEmail?: string | null },
): Promise<InfographicSectionResult> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured");
  }
  if (row.status !== "ready") {
    throw new Error("Report is not ready yet");
  }
  if (!hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: opts?.userEmail })) {
    throw new Error("Report must be unlocked");
  }

  const imageBuffer = await downloadSelfie(admin, row.image_path);
  return generateOneSection(admin, row, section, imageBuffer, opts?.force === true);
}

/** Paid-tier: generate multiple sections in one invocation (tests / manual retry only). */
export async function runAnalysisInfographics(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: InfographicReportRow,
  sections: AnalysisInfographicSectionId[],
  opts?: { force?: boolean; userEmail?: string | null },
): Promise<Record<string, InfographicSectionResult>> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured");
  }
  if (row.status !== "ready") {
    throw new Error("Report is not ready yet");
  }
  if (!hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: opts?.userEmail })) {
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
  return MANUAL_PAID_INFOGRAPHIC_SECTIONS.filter((section) =>
    sectionNeedsGeneration(row, section, force),
  );
}

/** User-triggered paid sections (not auto-queued on unlock). */
export const MANUAL_PAID_INFOGRAPHIC_SECTIONS = [
  "skin",
  "color",
  "hairstyle",
  "spectacles",
  "hairColor",
] as const satisfies readonly AnalysisInfographicSectionId[];

export type ManualPaidInfographicSection = (typeof MANUAL_PAID_INFOGRAPHIC_SECTIONS)[number];

export function isManualPaidInfographicSection(
  section: string,
): section is ManualPaidInfographicSection {
  return (MANUAL_PAID_INFOGRAPHIC_SECTIONS as readonly string[]).includes(section);
}

function sectionNeedsGeneration(
  row: InfographicReportRow,
  section: AnalysisInfographicSectionId,
  force?: boolean,
): boolean {
  if (sectionDataReady(section, row)) return false;
  const visualAssets = parseVisualAssets(row.visual_assets);
  const existing = getAnalysisInfographicAsset(visualAssets, section);
  if (existing?.status === "pending") return false;
  if (force) return true;
  return !existing || existing.status === "missing";
}

export function faceFeaturesNeedsGeneration(row: InfographicReportRow, force?: boolean): boolean {
  return sectionNeedsGeneration(row, "faceFeatures", force);
}

export function previewNeedsGeneration(row: InfographicReportRow, force?: boolean): boolean {
  if (sectionDataReady("faceFeaturesPreview", row)) return false;
  const visualAssets = parseVisualAssets(row.visual_assets);
  const existing = getAnalysisInfographicAsset(visualAssets, "faceFeaturesPreview");
  if (existing?.status === "pending") return false;
  if (force) return true;
  return !existing || existing.status === "missing";
}
