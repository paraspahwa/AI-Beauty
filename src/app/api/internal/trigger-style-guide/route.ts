/**
 * POST /api/internal/trigger-style-guide
 *
 * Background generation of Style Guide infographic (add-on, requires full-body photo).
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  runStyleGuideInfographic,
  styleGuideNeedsGeneration,
  type StyleGuideReportRow,
} from "@/lib/ai/run-style-guide-infographic";

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

    const { reportId, force } = (await req.json()) as {
      reportId?: string;
      force?: boolean;
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
        "id, user_id, status, is_style_guide_paid, body_image_path, style_guide, face_shape, color_analysis, features, summary, visual_assets",
      )
      .eq("id", reportId)
      .single();

    if (rowErr || !row) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (row.status !== "ready") {
      return NextResponse.json({ skipped: true, reason: "not_ready" });
    }

    const reportRow = row as StyleGuideReportRow;

    if (!styleGuideNeedsGeneration(reportRow, force)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_complete" });
    }

    const result = await runStyleGuideInfographic(admin, reportRow, { force });
    console.info(`[trigger-style-guide] report ${reportId}`, result);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[trigger-style-guide]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
