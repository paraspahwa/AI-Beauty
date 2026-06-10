import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import {
  createMomentToken,
  isAllowedMomentUrl,
  persistMomentImages,
} from "@/lib/moment-share";

export const runtime = "nodejs";
export const maxDuration = 30;

type MomentBody = {
  assetId?: string;
  beforeUrl?: string;
  afterUrl?: string;
  caption?: string;
};

export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    const body = (await req.json()) as MomentBody;
    const caption =
      typeof body.caption === "string"
        ? body.caption.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, 120)
        : "Made with Renovaara";

    const admin = createSupabaseAdminClient();
    let beforePath: string;
    let afterPath: string;

    if (typeof body.assetId === "string" && body.assetId.length > 0) {
      const user = await getRequestUser(req);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: asset } = await admin
        .from("generated_assets")
        .select("id, user_id, source_image_path, result_image_path")
        .eq("id", body.assetId)
        .single();

      if (!asset || asset.user_id !== user.id) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      beforePath = asset.source_image_path;
      afterPath = asset.result_image_path;
    } else if (typeof body.beforeUrl === "string" && typeof body.afterUrl === "string") {
      if (!isAllowedMomentUrl(body.beforeUrl) || !isAllowedMomentUrl(body.afterUrl)) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }

      const paths = await persistMomentImages(body.beforeUrl, body.afterUrl, async (path, buffer) => {
        const { error } = await admin.storage
          .from(env.supabase.bucket)
          .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
        if (error) throw error;
      });
      beforePath = paths.beforePath;
      afterPath = paths.afterPath;
    } else {
      return NextResponse.json({ error: "Provide assetId or beforeUrl + afterUrl" }, { status: 400 });
    }

    const token = createMomentToken({ b: beforePath, a: afterPath, caption });
    const shareUrl = `${env.app.url}/m/${encodeURIComponent(token)}`;
    const ogImageUrl = `${env.app.url}/api/og/moment/${encodeURIComponent(token)}`;

    return NextResponse.json({ shareUrl, ogImageUrl, token });
  } catch (err) {
    console.error("[POST /api/studio/moment]", err);
    return NextResponse.json({ error: "Failed to create share moment" }, { status: 500 });
  }
}
