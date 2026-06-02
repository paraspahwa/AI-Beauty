import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

type CanvasRow = {
  id: string;
  selfie_path: string;
};

type CanvasAssetRow = {
  id: string;
  result_image_path: string;
  meta: { lowResPath?: string; hdResPath?: string } | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * POST /api/privacy/cloud-data
 * Purges temporary Studio canvas data for the authenticated user:
 * - studio_canvases rows
 * - generated_assets rows linked to canvas sessions
 * - associated storage files (selfies + generated low/hd assets)
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    const [canvasesResult, assetsResult] = await Promise.all([
      admin
        .from("studio_canvases")
        .select("id, selfie_path")
        .eq("user_id", user.id),
      admin
        .from("generated_assets")
        .select("id, result_image_path, meta")
        .eq("user_id", user.id)
        .not("studio_canvas_id", "is", null),
    ]);

    if (canvasesResult.error) {
      console.error("[privacy/cloud-data] failed to load canvases", canvasesResult.error);
      return NextResponse.json({ error: "Failed to load cloud canvas data" }, { status: 500 });
    }

    if (assetsResult.error) {
      console.error("[privacy/cloud-data] failed to load assets", assetsResult.error);
      return NextResponse.json({ error: "Failed to load generated assets" }, { status: 500 });
    }

    const canvases = (canvasesResult.data ?? []) as CanvasRow[];
    const assets = (assetsResult.data ?? []) as CanvasAssetRow[];

    const storagePaths = new Set<string>();
    for (const canvas of canvases) {
      if (canvas.selfie_path) storagePaths.add(canvas.selfie_path);
    }
    for (const asset of assets) {
      if (asset.result_image_path) storagePaths.add(asset.result_image_path);
      const meta = asset.meta ?? {};
      if (meta.lowResPath) storagePaths.add(meta.lowResPath);
      if (meta.hdResPath) storagePaths.add(meta.hdResPath);
    }

    const deleteAssetsPromise = admin
      .from("generated_assets")
      .delete()
      .eq("user_id", user.id)
      .not("studio_canvas_id", "is", null);

    const deleteCanvasesPromise = admin
      .from("studio_canvases")
      .delete()
      .eq("user_id", user.id);

    const [deleteAssetsResult, deleteCanvasesResult] = await Promise.all([
      deleteAssetsPromise,
      deleteCanvasesPromise,
    ]);

    if (deleteAssetsResult.error) {
      console.error("[privacy/cloud-data] failed to delete assets", deleteAssetsResult.error);
      return NextResponse.json({ error: "Failed to remove generated assets" }, { status: 500 });
    }

    if (deleteCanvasesResult.error) {
      console.error("[privacy/cloud-data] failed to delete canvases", deleteCanvasesResult.error);
      return NextResponse.json({ error: "Failed to remove canvas sessions" }, { status: 500 });
    }

    const uniquePaths = Array.from(storagePaths);
    let removedFiles = 0;
    let storageCleanupFailed = false;

    if (uniquePaths.length > 0) {
      const batches = chunk(uniquePaths, 100);
      for (const batch of batches) {
        const { error } = await admin.storage.from(env.supabase.bucket).remove(batch);
        if (error) {
          storageCleanupFailed = true;
          console.warn("[privacy/cloud-data] storage cleanup failed", error.message);
        } else {
          removedFiles += batch.length;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      removed: {
        canvases: canvases.length,
        generatedAssets: assets.length,
        storageFiles: removedFiles,
      },
      storageCleanupFailed,
    });
  } catch (err) {
    console.error("[privacy/cloud-data]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
