import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    if (!UUID_RE.test(assetId)) {
      return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
    }

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: asset, error: assetErr } = await admin
      .from("generated_assets")
      .select("id, user_id, result_image_path")
      .eq("id", assetId)
      .single();

    if (assetErr || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    if (asset.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: imageData, error: imageErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(asset.result_image_path as string);

    if (imageErr || !imageData) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
    }

    const rawBuf = Buffer.from(await imageData.arrayBuffer());
    const meta = await sharp(rawBuf).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) {
      return NextResponse.json({ error: "Invalid source image" }, { status: 422 });
    }

    const MAX_DIMENSION = 2048;
    const targetWidth = Math.min(width * 2, MAX_DIMENSION);
    const targetHeight = Math.min(height * 2, MAX_DIMENSION);

    const upscaled = await sharp(rawBuf)
      .rotate()
      .resize(targetWidth, targetHeight, {
        fit: "inside",
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({ sigma: 1.2, m1: 1, m2: 2, x1: 2, y2: 10, y3: 20 })
      .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
      .toBuffer();

    const filename = `renovaara-upscaled-${assetId}.jpg`;

    return new NextResponse(new Uint8Array(upscaled), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[vault/images/[assetId]/upscale-download POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
