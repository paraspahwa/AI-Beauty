import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
// Cache at CDN for 1 hour; revalidate in background
export const revalidate = 3600;

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

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
