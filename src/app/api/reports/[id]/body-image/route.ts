import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { isAdminUserEmail } from "@/lib/auth/access";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;

function validateMagicBytes(buf: Buffer): boolean {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  return false;
}

/**
 * POST /api/reports/[id]/body-image
 * Upload full-body photo for Style Guide add-on (requires main report unlocked).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    env.assertServer();
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: report } = await admin
      .from("reports")
      .select("id,user_id,status,is_paid,is_style_guide_paid,body_image_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!report.is_paid) {
      return NextResponse.json({ error: "Unlock the main report first" }, { status: 403 });
    }
    if (report.is_style_guide_paid && !isAdminUserEmail(user.email)) {
      return NextResponse.json({ error: "Style Guide already purchased" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WEBP images are accepted" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 12 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "File content does not match a valid image format" },
        { status: 400 },
      );
    }

    const { default: sharp } = await import("sharp");
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < 1 || height < 1) {
      return NextResponse.json({ error: "Invalid image dimensions" }, { status: 400 });
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return NextResponse.json(
        { error: `Image too large in dimensions (maximum ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION})` },
        { status: 400 },
      );
    }

    const jpegBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    const bodyImagePath = `${user.id}/${id}-body.jpg`;

    const { error: upErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(bodyImagePath, jpegBuffer, { contentType: "image/jpeg", upsert: true });
    if (upErr) {
      console.error("[body-image] upload failed", upErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { error: updErr } = await admin
      .from("reports")
      .update({ body_image_path: bodyImagePath })
      .eq("id", id);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, bodyImageUploaded: true });
  } catch (err) {
    console.error("[POST /api/reports/[id]/body-image]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
