import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCanvasQuota } from "@/lib/entitlement";
import { compressForAI } from "@/lib/ai/image";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/studio/upload
 * 
 * Upload a photo to create a new Studio Canvas session.
 * Free users: 3 try-ons/month
 * Paid users: 3 + report studio gens/month
 * Studio Pro: Unlimited
 * 
 * Request: FormData with "file" (image)
 * Response: { canvasId, photoUrl, quota: { remaining, tier } }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Check file size (8MB max)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 8MB)" },
        { status: 400 }
      );
    }

    // Compress image (512px max for consistency)
    const buffer = await file.arrayBuffer();
    const compressed = await compressForAI(Buffer.from(buffer));

    // Check quota BEFORE uploading
    const quota = await getCanvasQuota(user.id);
    if (quota.remaining <= 0 && quota.tier !== "studio_pro") {
      return NextResponse.json(
        { error: "Canvas quota exceeded. Upgrade to continue." },
        { status: 429 }
      );
    }

    // Generate canvas ID
    const canvasId = crypto.randomUUID();
    const timestamp = Date.now();
    const filename = `canvases/${user.id}/${canvasId}_${timestamp}.jpg`;

    // Upload to storage
    const admin = createSupabaseAdminClient();
    const { error: uploadErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(filename, compressed, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[studio/upload] Storage upload failed:", uploadErr.message);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Create studio_canvases row
    const { data: canvas, error: dbErr } = await supabase
      .from("studio_canvases")
      .insert({
        id: canvasId,
        user_id: user.id,
        selfie_path: filename,
        color_palette: null,
      })
      .select("id, created_at")
      .single();

    if (dbErr) {
      console.error("[studio/upload] DB insert failed:", dbErr.message);
      return NextResponse.json(
        { error: "Failed to create canvas session" },
        { status: 500 }
      );
    }

    // Sign URL for preview
    const { data: signed } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(filename, 60 * 60); // 1 hour

    return NextResponse.json({
      canvasId: canvas.id,
      photoUrl: signed?.signedUrl ?? "",
      quota: {
        remaining: Math.max(0, quota.remaining - 1),
        tier: quota.tier,
        usedThisMonth: quota.used + 1,
      },
    });

  } catch (err) {
    console.error("[studio/upload] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
