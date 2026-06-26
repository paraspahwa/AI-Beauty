import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { hasPremiumAccess } from "@/lib/auth/access";
import { env } from "@/lib/env";
import { BLUEPRINT_SECTIONS, isAnalysisInfographicSectionId } from "@/lib/ai/infographic-sections";
import { signAnalysisInfographicAssets } from "@/lib/ai/analysis-infographics";
import { kickOffInfographicsInBackground } from "@/lib/ai/kickoff-infographics";
import { runAnalysisInfographics, type InfographicReportRow } from "@/lib/ai/run-analysis-infographics";
import type { ReportVisualAssets } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

/**
 * GET /api/reports/[id]/infographics
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("reports")
    .select("id, user_id, status, is_paid, visual_assets")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isPaid = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const visualAssets = parseVisualAssets(row.visual_assets);
  const signed = visualAssets
    ? await signAnalysisInfographicAssets(visualAssets, admin)
    : undefined;

  const sections = BLUEPRINT_SECTIONS.map((meta) => {
    const asset = signed?.assets.analysisInfographics?.[meta.id];
    return {
      ...meta,
      asset: asset
        ? {
            status: asset.status,
            signedUrl: isPaid ? asset.signedUrl : undefined,
            width: asset.width,
            height: asset.height,
            error: asset.error,
            styleName: asset.styleName,
          }
        : { status: "missing" as const },
    };
  });

  return NextResponse.json({
    reportId: id,
    reportStatus: row.status,
    isPaid,
    falConfigured: env.fal.isConfigured,
    sections,
  });
}

/**
 * POST /api/reports/[id]/infographics
 * Body: { sections?: string[], all?: boolean, force?: boolean }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { sections?: string[]; all?: boolean; force?: boolean } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }

    const force = body.force === true;
    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select(
        "id, user_id, status, is_paid, image_path, face_shape, features, skin_analysis, color_analysis, hairstyle, glasses, summary, visual_assets",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (row.status !== "ready") {
      return NextResponse.json({ error: "Report is not ready yet" }, { status: 409 });
    }

    const isPaid = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
    if (!isPaid) {
      return NextResponse.json(
        { error: "Unlock the full report to generate blueprint infographics" },
        { status: 403 },
      );
    }

    if (!env.fal.isConfigured) {
      return NextResponse.json(
        { error: "Infographic generation is not configured (FAL_KEY missing)" },
        { status: 503 },
      );
    }

    if (body.all) {
      kickOffInfographicsInBackground(id);
      return NextResponse.json({ ok: true, queued: true });
    }

    const requested = (body.sections ?? ["faceFeatures"]).filter(isAnalysisInfographicSectionId);
    if (requested.length === 0) {
      return NextResponse.json({ error: "No valid sections requested" }, { status: 400 });
    }

    const results = await runAnalysisInfographics(admin, row as InfographicReportRow, requested, { force });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[infographics/generate]", err);
    return NextResponse.json({ error: (err as Error).message || "Generation failed" }, { status: 500 });
  }
}
