import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { hasPremiumAccess } from "@/lib/auth/access";
import { env } from "@/lib/env";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import type { GlassesResult, HairstyleResult, ReportVisualAsset } from "@/types/report";
import {
  createVisualAssetsSkeleton,
  generateGlassesPreviews,
  generateHairstylePreviews,
} from "@/lib/ai/visuals";
import { generateHairColorPreviews } from "@/lib/ai/hair-color-preview";
import { isReportSelfiePath } from "@/lib/vault/vault-item-id";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SectionType = "glasses" | "hairstyle" | "hairColor";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sectionType = req.nextUrl.searchParams.get("type") as SectionType | null;
    const slotIndexParam = req.nextUrl.searchParams.get("index");
    const slotIndex =
      slotIndexParam !== null && /^[0-4]$/.test(slotIndexParam)
        ? parseInt(slotIndexParam, 10)
        : null;

    if (!sectionType) {
      return NextResponse.json({ error: "type query param required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, rekognition, is_paid, glasses, hairstyle, visual_assets")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") {
      return NextResponse.json({ error: "Report is not ready yet" }, { status: 409 });
    }
    if (!hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email })) {
      return NextResponse.json({ error: "Report must be unlocked" }, { status: 403 });
    }
    if (!isReportSelfiePath(row.image_path, user.id, row.id)) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 500 });
    }

    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 500 });

    const selfieBuf = Buffer.from(await imgData.arrayBuffer());
    const gender = normalizeRekognitionGender(row.rekognition);
    const hairstyle = row.hairstyle as HairstyleResult;
    const glasses = row.glasses as GlassesResult;

    const previewsKey =
      sectionType === "glasses"
        ? "glassesPreviews"
        : sectionType === "hairstyle"
          ? "hairstylePreviews"
          : "hairColorPreviews";

    const existingVA = row.visual_assets as { assets?: Record<string, ReportVisualAsset[]> } | null;
    let visualAssets =
      existingVA?.assets
        ? (row.visual_assets as import("@/types/report").ReportVisualAssets)
        : createVisualAssetsSkeleton(row.user_id, row.id, env.supabase.bucket);

    const basePath = visualAssets.basePath;
    const maxSlots = sectionType === "glasses" ? 3 : 5;
    const names =
      sectionType === "glasses"
        ? glasses.recommended.slice(0, 3).map((s) => s.style)
        : sectionType === "hairstyle"
          ? hairstyle.styles.slice(0, 5).map((s) => s.name)
          : hairstyle.colors.slice(0, 5).map((c) => c.name);

    const prefix =
      sectionType === "glasses" ? "glasses" : sectionType === "hairstyle" ? "hairstyle" : "hair-color";

    if (!visualAssets.assets[previewsKey]?.length) {
      visualAssets.assets[previewsKey] = Array.from({ length: maxSlots }, (_, i) => ({
        path: `${basePath}${prefix}-${i}.jpg`,
        status: "missing" as const,
        mime: "image/jpeg",
        error: null,
        styleName: names[i] ?? `${prefix} ${i + 1}`,
      }));
    }

    const indices =
      slotIndex !== null ? [slotIndex] : Array.from({ length: maxSlots }, (_, i) => i);

    let buffers: { index: number; buffer: Buffer }[] = [];

    if (sectionType === "hairstyle") {
      const results = await generateHairstylePreviews(
        selfieBuf,
        hairstyle,
        row.rekognition,
        indices,
        gender,
      );
      buffers = results.map((r) => ({ index: r.index, buffer: r.buffer }));
    } else if (sectionType === "glasses") {
      const results = await generateGlassesPreviews(
        selfieBuf,
        glasses,
        row.rekognition,
        indices,
      );
      buffers = results.map((r) => ({ index: r.index, buffer: r.buffer }));
    } else {
      const results = await generateHairColorPreviews(
        selfieBuf,
        hairstyle,
        gender,
        indices,
      );
      buffers = results.map((r) => ({ index: r.index, buffer: r.buffer }));
    }

    const slots = visualAssets.assets[previewsKey]!;
    for (const { index, buffer } of buffers) {
      const asset = slots[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(asset.path, buffer, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      asset.error = upErr?.message ?? null;
      if (!upErr) {
        const sharp = (await import("sharp")).default;
        const meta = await sharp(buffer).metadata();
        asset.width = meta.width;
        asset.height = meta.height;
      }
    }

    await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", id);

    return NextResponse.json({ ok: true, generated: buffers.length });
  } catch (err) {
    console.error("[visuals]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
