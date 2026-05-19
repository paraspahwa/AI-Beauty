import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  const { assetId } = params;
  if (!assetId) return NextResponse.json({ error: "Missing assetId" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: asset } = await admin
    .from("generated_assets")
    .select("result_image_path, meta")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const meta = asset.meta || {};
  const lowResPath = meta.lowResPath || null;
  const hdResPath = meta.hdResPath || asset.result_image_path;
  let lowResUrl = null;
  let hdUrl = null;
  if (lowResPath) {
    const { data } = await admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600);
    lowResUrl = data?.signedUrl ?? null;
  }
  if (hdResPath) {
    const { data } = await admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath, 3600);
    hdUrl = data?.signedUrl ?? null;
  }
  return NextResponse.json({ lowResUrl, hdUrl });
}
