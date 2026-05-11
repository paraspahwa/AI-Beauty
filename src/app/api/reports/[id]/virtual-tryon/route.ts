/**
 * POST /api/reports/[id]/virtual-tryon
 *
 * Virtual clothing try-on using fal-ai/image-apps-v2/virtual-try-on.
 *
 * Body (multipart/form-data OR JSON):
 *   - clothImage: File  (multipart) | clothUrl: string (JSON)
 *
 * The user's selfie is read from storage (the report's image_path).
 * The garment image is accepted as an upload from the client.
 *
 * Returns: { url: string } — signed URL (1 h) of the result stored in Supabase.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_CLOTH_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    env.assertServer();
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    // ── Fetch the report row ────────────────────────────────────────────────
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, image_path, visual_assets, is_paid")
      .eq("id", id)
      .single();
    if (rowErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!env.fal?.isConfigured) {
      return NextResponse.json({ error: "FAL not configured" }, { status: 503 });
    }

    // ── Read garment image from multipart upload ────────────────────────────
    let clothBuf: Buffer;
    let clothMime = "image/jpeg";
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("clothImage") as File | null;
      if (!file) return NextResponse.json({ error: "clothImage is required" }, { status: 400 });
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
      }
      if (file.size > MAX_CLOTH_BYTES) {
        return NextResponse.json({ error: "Garment image too large (max 10 MB)" }, { status: 413 });
      }
      clothBuf = Buffer.from(await file.arrayBuffer());
      clothMime = file.type;
    } else {
      // JSON body with a public clothUrl (e.g. a previously uploaded garment)
      const body = (await req.json().catch(() => ({}))) as { clothUrl?: string };
      if (!body.clothUrl) return NextResponse.json({ error: "clothImage or clothUrl is required" }, { status: 400 });
      const dlRes = await fetch(body.clothUrl);
      if (!dlRes.ok) return NextResponse.json({ error: "Could not fetch cloth URL" }, { status: 422 });
      clothBuf = Buffer.from(await dlRes.arrayBuffer());
      clothMime = dlRes.headers.get("content-type") ?? "image/jpeg";
    }

    // ── Load the selfie from private storage ───────────────────────────────
    const { data: selfieData, error: selfieErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (selfieErr || !selfieData) {
      return NextResponse.json({ error: "Selfie unavailable" }, { status: 422 });
    }
    const selfieBuf = Buffer.from(await selfieData.arrayBuffer());

    // ── Encode both images as base64 data URIs (private bucket safe) ───────
    const selfieUri = `data:image/jpeg;base64,${selfieBuf.toString("base64")}`;
    const clothUri  = `data:${clothMime};base64,${clothBuf.toString("base64")}`;

    // ── Run FAL virtual-try-on ──────────────────────────────────────────────
    const { createFalClient } = await import("@fal-ai/client");
    const falClient = createFalClient({ credentials: env.fal.apiKey });

    const falResult = await falClient.run("fal-ai/image-apps-v2/virtual-try-on", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: {
        human_image_url: selfieUri,
        garment_image_url: clothUri,
      } as any,
    }) as { image?: { url: string }; images?: { url: string }[] };

    const resultUrl: string =
      falResult?.image?.url ??
      (falResult?.images as { url: string }[] | undefined)?.[0]?.url ?? "";

    if (!resultUrl) {
      return NextResponse.json({ error: "No output from FAL" }, { status: 500 });
    }

    // ── Download result and persist to Supabase storage ────────────────────
    const resultRes = await fetch(resultUrl);
    if (!resultRes.ok) return NextResponse.json({ error: "Download failed" }, { status: 500 });
    const resultBuf = Buffer.from(await resultRes.arrayBuffer());

    const ts = Date.now();
    const storagePath = `tryon-results/${user.id}/${id}/${ts}.jpg`;
    const { error: upErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(storagePath, resultBuf, { contentType: "image/jpeg", upsert: false });

    if (upErr) {
      // Fall back to returning the FAL URL directly (short-lived but usable)
      return NextResponse.json({ url: resultUrl, stored: false });
    }

    // ── Persist latest tryon path in visual_assets for history ─────────────
    const existingVa = (row.visual_assets ?? {}) as Record<string, unknown>;
    const history = ((existingVa.tryonHistory ?? []) as string[]).slice(-9); // keep last 10
    history.push(storagePath);
    await admin
      .from("reports")
      .update({ visual_assets: { ...existingVa, tryonHistory: history, tryonLatest: storagePath } })
      .eq("id", id);

    // ── Return signed URL ───────────────────────────────────────────────────
    const { data: signed } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({ url: signed?.signedUrl ?? resultUrl, stored: true });
  } catch (err) {
    console.error("[virtual-tryon route]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
