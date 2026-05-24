import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    if (!assetId) {
      return NextResponse.json({ error: "Missing assetId" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: asset, error: fetchError } = await admin
      .from("generated_assets")
      .select("id, user_id, result_image_path, meta")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: "Failed to load asset" }, { status: 500 });
    }

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const meta = (asset.meta ?? {}) as { lowResPath?: string; hdResPath?: string };
    const paths = Array.from(new Set([asset.result_image_path, meta.lowResPath, meta.hdResPath].filter(Boolean))) as string[];

    const { error: deleteError } = await admin
      .from("generated_assets")
      .delete()
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove asset" }, { status: 500 });
    }

    if (paths.length > 0) {
      const { error: storageError } = await admin.storage.from(env.supabase.bucket).remove(paths);
      if (storageError) {
        console.warn("[studio/vault DELETE] storage cleanup failed", storageError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[studio/vault DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
