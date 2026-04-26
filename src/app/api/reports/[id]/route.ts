import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { CompiledReport } from "@/types/report";

export const runtime = "nodejs";

/**
 * GET /api/reports/[id]
 * Returns the compiled report. Locked sections are stripped if not paid.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sign a short-lived URL for the original image
  const admin = createSupabaseAdminClient();
  const { data: signed } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  const isPaid = !!row.is_paid;

  const report: CompiledReport = {
    id: row.id,
    userId: row.user_id,
    imageUrl: signed?.signedUrl ?? "",
    status: row.status,
    isPaid,
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: row.color_analysis ?? undefined,
    // Free preview shows ONLY face shape + color analysis
    skinAnalysis: isPaid ? row.skin_analysis ?? undefined : undefined,
    features:     isPaid ? row.features      ?? undefined : undefined,
    glasses:      isPaid ? row.glasses       ?? undefined : undefined,
    hairstyle:    isPaid ? row.hairstyle     ?? undefined : undefined,
    summary:      row.summary ?? undefined,
    createdAt:    row.created_at,
  };

  return NextResponse.json(report);
}
