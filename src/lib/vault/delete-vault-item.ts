import { env } from "@/lib/env";
import { parseReportVisualAssets } from "@/lib/pdf/infographic-slides";
import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  DELETED_SELFIE_PATH,
  clearAnalysisSection,
  isReportBodyImagePath,
  isReportScopedStoragePath,
  isReportSelfiePath,
  parseVaultItemId,
  removeStoragePaths,
  type ParsedVaultItemId,
} from "@/lib/vault/vault-item-id";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type ReportRow = {
  id: string;
  user_id: string;
  image_path: string;
  body_image_path: string | null;
  visual_assets: unknown;
};

const BASE_SELECT = "id, user_id, image_path, visual_assets";
const EXTENDED_SELECT = `${BASE_SELECT}, body_image_path`;

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return error.code === "42703" || msg.includes("body_image_path") || msg.includes("does not exist");
}

async function fetchOwnedReport(
  admin: AdminClient,
  reportId: string,
  userId: string,
): Promise<ReportRow | null> {
  const extended = await admin
    .from("reports")
    .select(EXTENDED_SELECT)
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!extended.error && extended.data) {
    return extended.data as ReportRow;
  }

  if (extended.error && !isMissingColumnError(extended.error)) {
    throw extended.error;
  }

  const base = await admin
    .from("reports")
    .select(BASE_SELECT)
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (base.error) throw base.error;
  if (!base.data) return null;

  return { ...(base.data as Omit<ReportRow, "body_image_path">), body_image_path: null };
}

async function deleteUploadItem(
  admin: AdminClient,
  report: ReportRow,
  parsed: Extract<ParsedVaultItemId, { kind: "upload" }>,
): Promise<void> {
  const bucket = env.supabase.bucket;

  if (parsed.uploadType === "selfie") {
    if (!isReportSelfiePath(report.image_path, report.user_id, report.id)) {
      throw new Error("Selfie already removed");
    }
    await removeStoragePaths(admin, bucket, [report.image_path]);
    const { error } = await admin
      .from("reports")
      .update({ image_path: DELETED_SELFIE_PATH })
      .eq("id", report.id)
      .eq("user_id", report.user_id);
    if (error) throw error;
    return;
  }

  if (!isReportBodyImagePath(report.body_image_path, report.user_id, report.id)) {
    throw new Error("Body photo already removed");
  }
  await removeStoragePaths(admin, bucket, [report.body_image_path]);
  const { error } = await admin
    .from("reports")
    .update({ body_image_path: null })
    .eq("id", report.id)
    .eq("user_id", report.user_id);
  if (error) throw error;
}

async function deleteAnalysisItem(
  admin: AdminClient,
  report: ReportRow,
  parsed: Extract<ParsedVaultItemId, { kind: "analysis" }>,
): Promise<void> {
  const visualAssets = parseReportVisualAssets(report.visual_assets);
  if (!visualAssets?.assets?.analysisInfographics) {
    throw new Error("Analysis asset not found");
  }

  const storagePath = clearAnalysisSection(visualAssets, parsed.section);
  if (!isReportScopedStoragePath(storagePath, report.user_id, report.id)) {
    throw new Error("Analysis asset not found");
  }

  await removeStoragePaths(admin, env.supabase.bucket, [storagePath]);

  const { error } = await admin
    .from("reports")
    .update({ visual_assets: visualAssets })
    .eq("id", report.id)
    .eq("user_id", report.user_id);
  if (error) throw error;
}

/**
 * Deletes a single vault item (selfie, body photo, or generated infographic).
 * PDF vault entries are generated on demand and cannot be deleted separately.
 */
export async function deleteVaultItem(
  admin: AdminClient,
  userId: string,
  itemId: string,
): Promise<void> {
  const parsed = parseVaultItemId(itemId);
  if (!parsed) {
    throw new Error("Invalid vault item");
  }

  const report = await fetchOwnedReport(admin, parsed.reportId, userId);
  if (!report) {
    throw new Error("Report not found");
  }

  if (parsed.kind === "upload") {
    await deleteUploadItem(admin, report, parsed);
    return;
  }

  await deleteAnalysisItem(admin, report, parsed);
}
