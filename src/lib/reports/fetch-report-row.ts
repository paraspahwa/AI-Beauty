import type { createSupabaseAdminClient } from "@/lib/supabase/server";

const BASE_REPORT_SELECT =
  "id, user_id, status, is_paid, image_path, face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, style_guide, rekognition, summary, visual_assets, pipeline_meta, created_at";

const EXTENDED_REPORT_SELECT = `${BASE_REPORT_SELECT}, body_image_path, is_style_guide_paid`;

export type OwnedReportRow = {
  id: string;
  user_id: string;
  status: string;
  is_paid: boolean;
  is_style_guide_paid: boolean;
  body_image_path: string | null;
  image_path: string;
  face_shape: unknown;
  color_analysis: unknown;
  skin_analysis: unknown;
  features: unknown;
  glasses: unknown;
  hairstyle: unknown;
  style_guide: unknown;
  rekognition: unknown;
  summary: string | null;
  visual_assets: unknown;
  pipeline_meta: unknown;
  created_at: string;
};

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    msg.includes("is_style_guide_paid") ||
    msg.includes("body_image_path") ||
    msg.includes("does not exist")
  );
}

/** Tolerates DBs where migration 0026 has not been applied yet. */
export async function fetchOwnedReportRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  reportId: string,
  userId: string,
): Promise<OwnedReportRow | null> {
  const runQuery = (select: string) =>
    admin
      .from("reports")
      .select(select)
      .eq("id", reportId)
      .eq("user_id", userId)
      .maybeSingle();

  const extended = await runQuery(EXTENDED_REPORT_SELECT);
  if (!extended.error && extended.data) {
    return extended.data as unknown as OwnedReportRow;
  }

  if (extended.error && !isMissingColumnError(extended.error)) {
    console.error("[fetchOwnedReportRow]", extended.error);
    return null;
  }

  const base = await runQuery(BASE_REPORT_SELECT);
  if (base.error || !base.data) {
    if (base.error) console.error("[fetchOwnedReportRow]", base.error);
    return null;
  }

  return {
    ...(base.data as unknown as Omit<OwnedReportRow, "is_style_guide_paid" | "body_image_path">),
    is_style_guide_paid: false,
    body_image_path: null,
  };
}
