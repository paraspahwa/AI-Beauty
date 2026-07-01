import type { VaultAnalysisSection } from "@/types/vault";
import type { AnalysisInfographics, ReportVisualAssets } from "@/types/report";
import { parseReportVisualAssets } from "@/lib/pdf/infographic-slides";

/** Sentinel stored in reports.image_path after user deletes their selfie. */
export const DELETED_SELFIE_PATH = "deleted";

const RESERVED_IMAGE_PATHS = new Set(["pending", DELETED_SELFIE_PATH]);

export function isVaultStoragePath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.length > 0 && !RESERVED_IMAGE_PATHS.has(path);
}

export function isReportSelfiePath(
  path: string | null | undefined,
  userId: string,
  reportId: string,
): path is string {
  return path === `${userId}/${reportId}.jpg`;
}

export function isReportBodyImagePath(
  path: string | null | undefined,
  userId: string,
  reportId: string,
): path is string {
  return path === `${userId}/${reportId}-body.jpg`;
}

export function isReportScopedStoragePath(
  path: string | null | undefined,
  userId: string,
  reportId: string,
): path is string {
  if (!isVaultStoragePath(path)) return false;
  const selfiePath = `${userId}/${reportId}.jpg`;
  const bodyImagePath = `${userId}/${reportId}-body.jpg`;
  return (
    path === selfiePath ||
    path === bodyImagePath ||
    path.startsWith(`${userId}/${reportId}/`) ||
    path.startsWith(`users/${userId}/reports/${reportId}/`)
  );
}

export type ParsedVaultItemId =
  | { reportId: string; kind: "upload"; uploadType: "selfie" | "body" }
  | { reportId: string; kind: "analysis"; section: VaultAnalysisSection };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ANALYSIS_SECTIONS = new Set<VaultAnalysisSection>([
  "faceFeaturesPreview",
  "faceFeatures",
  "skin",
  "color",
  "hairstyle",
  "spectacles",
  "hairColor",
  "styleGuide",
]);

export function parseVaultItemId(itemId: string): ParsedVaultItemId | null {
  const parts = itemId.split(":");
  if (parts.length !== 3) return null;

  const [reportId, kind, detail] = parts;
  if (!UUID_RE.test(reportId)) return null;

  if (kind === "upload" && (detail === "selfie" || detail === "body")) {
    return { reportId, kind: "upload", uploadType: detail };
  }

  if (kind === "analysis" && ANALYSIS_SECTIONS.has(detail as VaultAnalysisSection)) {
    return { reportId, kind: "analysis", section: detail as VaultAnalysisSection };
  }

  return null;
}

export async function removeStoragePaths(
  admin: { storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<unknown> } } },
  bucket: string,
  paths: string[],
): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  await admin.storage.from(bucket).remove(unique).catch(() => {});
}

export function clearAnalysisSection(
  visualAssets: ReportVisualAssets,
  section: VaultAnalysisSection,
): string | undefined {
  const infographics = visualAssets.assets.analysisInfographics;
  if (!infographics) return undefined;

  const asset = infographics[section as keyof AnalysisInfographics];
  const path = asset?.path;
  delete infographics[section as keyof AnalysisInfographics];
  return path;
}
