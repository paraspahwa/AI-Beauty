/**
 * POST /api/internal/trigger-infographics
 *
 * Background generation of analysis infographics.
 * mode=preview — face-shape-only (no payment required)
 * mode=full    — exactly ONE paid section per request (section required)
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  previewNeedsGeneration,
  runFaceFeaturesPreviewInfographic,
  runSinglePaidInfographic,
  sectionsNeedingGeneration,
  type InfographicReportRow,
} from "@/lib/ai/run-analysis-infographics";
import { isAnalysisInfographicSectionId } from "@/lib/ai/infographic-sections";
import type { AnalysisInfographicSectionId } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-internal-secret");
    const configured = env.internal.secret;

    if (!configured || configured.length < 16) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const secretBuf = Buffer.from(secret ?? "", "utf8");
    const configuredBuf = Buffer.from(configured, "utf8");
    const maxLen = Math.max(secretBuf.length, configuredBuf.length);
    const aBuf = Buffer.concat([secretBuf, Buffer.alloc(maxLen - secretBuf.length)]);
    const bBuf = Buffer.concat([configuredBuf, Buffer.alloc(maxLen - configuredBuf.length)]);
    const lengthMatch = secretBuf.length === configuredBuf.length;
    if (!timingSafeEqual(aBuf, bBuf) || !lengthMatch) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId, mode, force, section } = (await req.json()) as {
      reportId?: string;
      mode?: "preview" | "full";
      force?: boolean;
      section?: string;
    };

    if (!reportId || !UUID_RE.test(reportId)) {
      return NextResponse.json({ error: "reportId required" }, { status: 400 });
    }

    if (!env.fal.isConfigured) {
      return NextResponse.json({ skipped: true, reason: "fal_not_configured" });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select(
        "id, user_id, status, is_paid, image_path, rekognition, face_shape, features, skin_analysis, hairstyle, glasses, color_analysis, visual_assets",
      )
      .eq("id", reportId)
      .single();

    if (rowErr || !row) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (row.status !== "ready") {
      return NextResponse.json({ skipped: true, reason: "not_ready" });
    }

    const reportRow = row as InfographicReportRow;
    const resolvedMode = mode ?? "full";

    if (resolvedMode === "preview") {
      if (!previewNeedsGeneration(reportRow, force)) {
        return NextResponse.json({ ok: true, skipped: true, reason: "already_complete" });
      }
      const result = await runFaceFeaturesPreviewInfographic(admin, reportRow, { force });
      console.info(`[trigger-infographics] preview report ${reportId}`, result);
      return NextResponse.json({ ok: true, mode: "preview", result });
    }

    if (!row.is_paid) {
      return NextResponse.json({ skipped: true, reason: "not_paid" });
    }

    if (!section || !isAnalysisInfographicSectionId(section) || section === "faceFeaturesPreview") {
      return NextResponse.json(
        { error: "section is required for full mode (one section per job)" },
        { status: 400 },
      );
    }

    const paidSection = section as AnalysisInfographicSectionId;
    const toGenerate = sectionsNeedingGeneration(reportRow, force);
    if (!toGenerate.includes(paidSection)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_complete", section: paidSection });
    }

    const result = await runSinglePaidInfographic(admin, reportRow, paidSection, { force });
    if (result.status === "failed") {
      console.warn(`[trigger-infographics] report ${reportId} section ${paidSection} failed:`, result.error);
    } else {
      console.info(`[trigger-infographics] report ${reportId} section ${paidSection}`, result);
    }

    return NextResponse.json({ ok: true, mode: "full", section: paidSection, result });
  } catch (err) {
    console.error("[trigger-infographics]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
