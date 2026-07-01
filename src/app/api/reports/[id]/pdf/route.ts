import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import {
  collectReportAnalysisSlides,
  parseReportVisualAssets,
} from "@/lib/pdf/infographic-slides";
import { buildInfographicPdf } from "@/lib/pdf/generate-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/reports/[id]/pdf
 * Analysis PDF — one page per generated infographic (paid sections only).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!env.flags.pdfEnabled) {
    return NextResponse.json({ error: "PDF disabled" }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("reports")
    .select("id, user_id, status, is_paid, created_at, face_shape, visual_assets")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const hasPremium = !!row && hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  if (!row || !hasPremium || row.status !== "ready") {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  const visualAssets = parseReportVisualAssets(row.visual_assets);
  const slides = collectReportAnalysisSlides(visualAssets, row.user_id, row.id);

  if (slides.length === 0) {
    return NextResponse.json(
      { error: "Analysis images are still generating. Try again shortly." },
      { status: 409 },
    );
  }

  const shape = row.face_shape?.shape;
  const date = new Date(row.created_at).toISOString().slice(0, 10);

  try {
    const pdfBuffer = await buildInfographicPdf({
      admin,
      reportId: row.id,
      createdAt: row.created_at,
      slides,
      title: "Renovaara Analysis Report",
      subtitle: shape
        ? `Your complete AI beauty analysis — ${shape} face profile`
        : "Your complete AI beauty analysis infographics",
    });

    if (!pdfBuffer) {
      return NextResponse.json({ error: "Could not build PDF" }, { status: 500 });
    }

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Renovaara-analysis-${date}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[pdf/analysis]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
