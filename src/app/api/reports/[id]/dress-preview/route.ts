import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { generateTryOnImage } from "@/lib/ai/image-gen";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/reports/[id]/dress-preview
 *
 * Body: { colorName: string; colorHex: string }
 *
 * Returns: { imageUrl: string }  — a base64 data-URL of the generated PNG
 *
 * Uses gpt-image-1 (primary) or DALL-E 2 with a clothing-region mask (fallback)
 * to recolor only the clothing in the user's photo.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json() as { colorName?: string; colorHex?: string };
    const { colorName, colorHex } = body;

    if (!colorName || !colorHex) {
      return NextResponse.json({ error: "colorName and colorHex are required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Load report — must belong to this user
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") {
      return NextResponse.json({ error: "Report is not ready yet" }, { status: 409 });
    }

    if (!row.image_path) {
      return NextResponse.json({ error: "No source image on this report" }, { status: 422 });
    }

    // Download original photo from Supabase storage
    const { data: fileData, error: fileErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);

    if (fileErr || !fileData) {
      return NextResponse.json({ error: "Could not load source photo" }, { status: 500 });
    }

    const selfieBuf = Buffer.from(await fileData.arrayBuffer());

    // Build a descriptive style string, e.g. "warm olive green (#6B7C45)"
    const styleDescription = `${colorName} (${colorHex}) solid-colored top or blouse`;

    // Generate the try-on image
    const resultBuf = await generateTryOnImage(selfieBuf, styleDescription, "dress-recolor");

    // Return as base64 data URL so the client can display it instantly
    const b64 = resultBuf.toString("base64");
    const imageUrl = `data:image/png;base64,${b64}`;

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("[dress-preview] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
