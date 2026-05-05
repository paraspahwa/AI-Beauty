import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import Replicate from "replicate";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FLUX_KONTEXT_MODEL = "prunaai/flux-kontext-fast" as const;

function buildHairColorPrompt(colorName: string, colorHex: string): string {
  return (
    `Change ONLY the hair color to ${colorName} (hex ${colorHex}). ` +
    `Every strand of hair should be recolored to ${colorName} while preserving the exact hair style, ` +
    `texture, waves, curls, and volume. ` +
    `The person's face, skin tone, eyes, nose, lips, makeup, expression must remain IDENTICAL. ` +
    `The clothing color and style must remain IDENTICAL. ` +
    `The background must remain IDENTICAL. ` +
    `This is strictly a hair dye operation — ONLY the hair color changes, nothing else.`
  );
}

/**
 * POST /api/reports/[id]/hair-color
 * Body: { colorName: string; colorHex: string }
 *
 * Generates a try-on image with the user's selfie recolored to the selected hair color.
 * Returns a signed URL valid for 1 hour.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { colorName?: string; colorHex?: string };
    // Limit length to prevent prompt injection / DoS; strip non-printable chars
    const colorName = (body.colorName ?? "").trim().slice(0, 60).replace(/[^\x20-\x7E]/g, "");
    const colorHex = (body.colorHex ?? "").trim();
    if (!colorName || !/^#[0-9a-f]{6}$/i.test(colorHex)) {
      return NextResponse.json({ error: "colorName and valid colorHex (#rrggbb) are required" }, { status: 400 });
    }

    if (!env.replicate.isConfigured) {
      return NextResponse.json({ error: "Replicate not configured" }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    // Download selfie
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const rawBuf = Buffer.from(await imgData.arrayBuffer());

    // Phase 2.4: Build storage path early so we can cache-check before calling Replicate
    const slug = colorName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const storagePath = `users/${user.id}/reports/${id}/hair-color-${slug}.jpg`;

    // Cache hit: return existing signed URL without calling Replicate
    const { data: existingFile } = await admin.storage
      .from(env.supabase.bucket)
      .download(storagePath);
    if (existingFile) {
      const { data: cached } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(storagePath, 3600);
      if (cached?.signedUrl) {
        return NextResponse.json({ signedUrl: cached.signedUrl, cached: true });
      }
    }

    // Downscale to 640px for faster upload + processing
    const smallBuf = await sharp(rawBuf)
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
    const replicate = new Replicate({ auth: env.replicate.apiToken });

    const output = await replicate.run(FLUX_KONTEXT_MODEL, {
      input: {
        img_cond_path:       imageDataUri,
        prompt:              buildHairColorPrompt(colorName, colorHex),
        output_format:       "jpg",
        output_quality:      85,
        image_size:          512,
        num_inference_steps: 4,
      },
    });

    const url: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
    if (!url) return NextResponse.json({ error: "Generation failed" }, { status: 502 });

    // Download result from Replicate — 30 s timeout to avoid indefinite hangs
    const dlController = new AbortController();
    const dlTimeout = setTimeout(() => dlController.abort(), 30_000);
    let resultRes: Response;
    try {
      resultRes = await fetch(url, { signal: dlController.signal });
    } finally {
      clearTimeout(dlTimeout);
    }
    if (!resultRes.ok) return NextResponse.json({ error: "Failed to download generated image" }, { status: 502 });
    const resultBuf = Buffer.from(await resultRes.arrayBuffer());

    // Resize output to a consistent preview size
    const finalBuf = await sharp(resultBuf)
      .resize(400, 530, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();

    const { error: uploadErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(storagePath, finalBuf, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    // Return a signed URL (1 hour)
    const { data: signed } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({ signedUrl: signed?.signedUrl ?? null });
  } catch (err) {
    console.error("[hair-color] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
