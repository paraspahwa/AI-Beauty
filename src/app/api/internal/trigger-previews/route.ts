/**
 * POST /api/internal/trigger-previews
 *
 * Generates hairstyle, glasses, and hair-color previews for paid reports.
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import type { GlassesResult, HairstyleResult, ReportVisualAsset, ReportVisualAssets } from "@/types/report";
import {
  createVisualAssetsSkeleton,
  generateGlassesPreviews,
  generateHairstylePreviews,
} from "@/lib/ai/visuals";
import { generateHairColorPreviews } from "@/lib/ai/hair-color-preview";
import { isReportSelfiePath } from "@/lib/vault/vault-item-id";

export const runtime = "nodejs";
export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function verifyInternalSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-internal-secret");
  const configured = env.internal.secret;
  if (!configured || configured.length < 16) return false;
  const secretBuf = Buffer.from(secret ?? "", "utf8");
  const configuredBuf = Buffer.from(configured, "utf8");
  const maxLen = Math.max(secretBuf.length, configuredBuf.length);
  const aBuf = Buffer.concat([secretBuf, Buffer.alloc(maxLen - secretBuf.length)]);
  const bBuf = Buffer.concat([configuredBuf, Buffer.alloc(maxLen - configuredBuf.length)]);
  return secretBuf.length === configuredBuf.length && timingSafeEqual(aBuf, bBuf);
}

function previewsComplete(assets: ReportVisualAssets["assets"]): boolean {
  const hair = assets.hairstylePreviews ?? [];
  const glasses = assets.glassesPreviews ?? [];
  const colors = assets.hairColorPreviews ?? [];
  const hairDone = hair.length >= 5 && hair.every((s) => s.status === "ready" || s.status === "failed");
  const glassesDone = glasses.length >= 3 && glasses.every((s) => s.status === "ready" || s.status === "failed");
  const colorsDone = colors.length >= 5 && colors.every((s) => s.status === "ready" || s.status === "failed");
  return hairDone && glassesDone && colorsDone;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyInternalSecret(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId } = (await req.json()) as { reportId?: string };
    if (!reportId || !UUID_RE.test(reportId)) {
      return NextResponse.json({ error: "reportId required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, is_paid, rekognition, glasses, hairstyle, visual_assets")
      .eq("id", reportId)
      .single();

    if (rowErr || !row) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (row.status !== "ready") {
      return NextResponse.json({ skipped: true, reason: "not_ready" });
    }
    if (!row.is_paid) {
      return NextResponse.json({ skipped: true, reason: "not_paid" });
    }
    if (!isReportSelfiePath(row.image_path as string, row.user_id as string, row.id as string)) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 500 });
    }

    const existing = row.visual_assets as ReportVisualAssets | null;
    if (existing?.assets && previewsComplete(existing.assets)) {
      return NextResponse.json({ skipped: true, reason: "already_complete" });
    }

    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 500 });
    }
    const selfieBuf = Buffer.from(await imgData.arrayBuffer());
    const gender = normalizeRekognitionGender(row.rekognition);

    let visualAssets =
      existing?.version && existing.bucket && existing.basePath
        ? { ...existing, assets: { ...existing.assets } }
        : createVisualAssetsSkeleton(row.user_id as string, row.id as string, env.supabase.bucket);

    const basePath = visualAssets.basePath;
    const hairstyle = row.hairstyle as HairstyleResult;
    const glasses = row.glasses as GlassesResult;

    const initSlots = (
      key: "hairstylePreviews" | "glassesPreviews" | "hairColorPreviews",
      count: number,
      prefix: string,
      names: string[],
    ) => {
      const current = visualAssets.assets[key] ?? [];
      visualAssets.assets[key] = Array.from({ length: count }, (_, i) => {
        const prev = current[i];
        return {
          path: `${basePath}${prefix}-${i}.jpg`,
          status: prev?.status === "ready" ? "ready" : ("missing" as const),
          mime: "image/jpeg",
          error: prev?.error ?? null,
          styleName: names[i] ?? `${prefix} ${i + 1}`,
          ...(prev?.status === "ready" ? { width: prev.width, height: prev.height } : {}),
        };
      });
    };

    initSlots(
      "hairstylePreviews",
      5,
      "hairstyle",
      hairstyle.styles.slice(0, 5).map((s) => s.name),
    );
    initSlots(
      "glassesPreviews",
      3,
      "glasses",
      glasses.recommended.slice(0, 3).map((s) => s.style),
    );
    initSlots(
      "hairColorPreviews",
      5,
      "hair-color",
      hairstyle.colors.slice(0, 5).map((c) => c.name),
    );

    await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", reportId);

    const uploadSlot = async (
      key: "hairstylePreviews" | "glassesPreviews" | "hairColorPreviews",
      index: number,
      buffer: Buffer,
    ) => {
      const asset = visualAssets.assets[key]?.[index];
      if (!asset || asset.status === "ready") return;
      asset.status = "pending";
      await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", reportId);
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
    };

    const hairIndices = (visualAssets.assets.hairstylePreviews ?? [])
      .map((a, i) => (a.status !== "ready" ? i : -1))
      .filter((i) => i >= 0);
    if (hairIndices.length > 0) {
      const hairResults = await generateHairstylePreviews(
        selfieBuf,
        hairstyle,
        row.rekognition,
        hairIndices,
        gender,
      );
      for (const { index, buffer } of hairResults) {
        await uploadSlot("hairstylePreviews", index, buffer);
      }
    }

    const glassesIndices = (visualAssets.assets.glassesPreviews ?? [])
      .map((a, i) => (a.status !== "ready" ? i : -1))
      .filter((i) => i >= 0);
    if (glassesIndices.length > 0) {
      const glassesResults = await generateGlassesPreviews(
        selfieBuf,
        glasses,
        row.rekognition,
        glassesIndices,
      );
      for (const { index, buffer } of glassesResults) {
        await uploadSlot("glassesPreviews", index, buffer);
      }
    }

    const colorIndices = (visualAssets.assets.hairColorPreviews ?? [])
      .map((a, i) => (a.status !== "ready" ? i : -1))
      .filter((i) => i >= 0);
    if (colorIndices.length > 0) {
      const colorResults = await generateHairColorPreviews(
        selfieBuf,
        hairstyle,
        gender,
        colorIndices,
      );
      for (const { index, buffer } of colorResults) {
        await uploadSlot("hairColorPreviews", index, buffer);
      }
    }

    await admin.from("reports").update({ visual_assets: visualAssets }).eq("id", reportId);

    console.info(`[trigger-previews] ✓ report ${reportId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[trigger-previews]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
