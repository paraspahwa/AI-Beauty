import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
// No CDN caching — share revocation must take effect immediately
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/og/[token]
 * Streams the selfie for a shared report — used as the og:image for /r/[token].
 * Does NOT require auth. The share_token acts as the capability token.
 * Returns the image as image/jpeg with a 1-hour public cache.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createSupabaseAdminClient();

  // Look up the report by share_token
  const { data: report } = await admin
    .from("reports")
    .select("image_path")
    .eq("share_token", token)
    .eq("status", "ready")
    .single();

  if (!report?.image_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Download the image via service_role (bypasses signed-URL expiry)
  const { data: blob, error } = await admin.storage
    .from(env.supabase.bucket)
    .download(report.image_path);

  if (error || !blob) {
    return new NextResponse("Image unavailable", { status: 404 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  // Resize to 1200×630 OG thumbnail — avoids serving full-res selfie publicly
  const { default: sharp } = await import("sharp");
  const thumbnail = await sharp(buffer)
    .rotate()
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .jpeg({ quality: 80 })
    .toBuffer();

  return new NextResponse(new Uint8Array(thumbnail), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      // no-store: selfie must never be cached — share revocation must take effect immediately
      "Cache-Control": "no-store",
    },
  });
}
