import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { hasPremiumAccess } from "@/lib/auth/access";
import { env } from "@/lib/env";
import { BLUEPRINT_SECTIONS } from "@/lib/ai/infographic-sections";
import { getAnalysisInfographicAsset } from "@/lib/ai/analysis-infographics";
import { buildZipArchive, infographicZipFileName } from "@/lib/utils/zip-archive";
import type { AnalysisInfographicSectionId, ReportVisualAssets } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/reports/[id]/infographics/download
 * Bundles all ready Beauty Blueprint infographics into a ZIP.
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
    .select("id, user_id, is_paid, visual_assets")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isPaid = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  if (!isPaid) {
    return NextResponse.json({ error: "Unlock the full report to download blueprints" }, { status: 403 });
  }

  const visualAssets = row.visual_assets as ReportVisualAssets | null;
  const files: { name: string; data: Uint8Array }[] = [];

  for (const meta of BLUEPRINT_SECTIONS) {
    const asset = getAnalysisInfographicAsset(visualAssets ?? undefined, meta.id as AnalysisInfographicSectionId);
    if (!asset?.path || asset.status !== "ready") continue;

    const { data: fileData, error: dlErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(asset.path);

    if (dlErr || !fileData) continue;

    const buf = new Uint8Array(await fileData.arrayBuffer());
    files.push({
      name: infographicZipFileName(meta.id),
      data: buf,
    });
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No blueprint images ready yet — generate them first" },
      { status: 404 },
    );
  }

  const zipBuffer = buildZipArchive(files);
  const filename = `renovaara-blueprint-${id.slice(0, 8)}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
