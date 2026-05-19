import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GeneratedTool = "virtual_tryon" | "makeup" | "hair" | "outfit";

export function normalizeSourceAssetId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return UUID_RE.test(v) ? v : null;
}

export async function resolveSourceImagePath(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  defaultImagePath: string;
  sourceAssetId: string | null;
}) {
  const { admin, userId, defaultImagePath, sourceAssetId } = input;
  if (!sourceAssetId) {
    return {
      sourceImagePath: defaultImagePath,
      sourceAssetId: null,
    };
  }

  const { data, error } = await admin
    .from("generated_assets")
    .select("id, user_id, result_image_path")
    .eq("id", sourceAssetId)
    .single();

  if (error || !data || data.user_id !== userId) {
    throw new Error("Invalid sourceAssetId");
  }

  return {
    sourceImagePath: data.result_image_path as string,
    sourceAssetId: data.id as string,
  };
}

export async function insertGeneratedAsset(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  reportId?: string | null;
  studioCanvasId?: string | null;
  sourceAssetId: string | null;
  sourceImagePath: string;
  resultImagePath: string;
  tool: GeneratedTool;
  variant?: string | null;
  meta?: Record<string, unknown>;
}) {
  const { admin } = input;

  const { data, error } = await admin
    .from("generated_assets")
    .insert({
      user_id: input.userId,
      report_id: input.reportId ?? null,
      studio_canvas_id: input.studioCanvasId ?? null,
      source_asset_id: input.sourceAssetId,
      source_image_path: input.sourceImagePath,
      result_image_path: input.resultImagePath,
      bucket: env.supabase.bucket,
      tool: input.tool,
      variant: input.variant ?? null,
      meta: input.meta ?? {},
    })
    .select("id, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    createdAt: data.created_at as string,
  };
}
