import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { compressForAI } from "@/lib/ai/image";
import {
  GUEST_STUDIO_COOKIE,
  GUEST_TRYON_LIMIT,
  createGuestState,
  getGuestStudioStateFromRequest,
  serializeGuestState,
  canGuestTryOn,
} from "@/lib/guest-studio";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_UPLOAD_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Guest studio upload — no auth required.
 * Quota: 3 try-ons per guest cookie session.
 */
export async function POST(request: NextRequest) {
  try {
    env.assertServer();

    const existing = getGuestStudioStateFromRequest(request) ?? createGuestState();
    if (!canGuestTryOn(existing)) {
      return NextResponse.json(
        { error: "Free try-on limit reached. Sign in to save your looks and continue.", code: "GUEST_QUOTA" },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const compressed = await compressForAI(Buffer.from(buffer));
    const canvasId = crypto.randomUUID();
    const guestId = existing.guestId;
    const filename = `canvases/guest/${guestId}/${canvasId}_${Date.now()}.jpg`;

    const admin = createSupabaseAdminClient();
    const { error: uploadErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(filename, compressed, { contentType: "image/jpeg", upsert: false });

    if (uploadErr) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: signed } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(filename, 60 * 60);

    const nextState = {
      ...existing,
      canvasId,
      selfiePath: filename,
      photoUrl: signed?.signedUrl ?? "",
    };
    const res = NextResponse.json({
      canvasId,
      photoUrl: signed?.signedUrl ?? "",
      guest: true,
      remaining: GUEST_TRYON_LIMIT - existing.tryOnCount,
      guestState: serializeGuestState(nextState),
    });

    res.cookies.set(GUEST_STUDIO_COOKIE, serializeGuestState(nextState), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[POST /api/studio/guest-upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
