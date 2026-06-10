import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { hasPremiumAccess } from "@/lib/auth/access";
import {
  previewSummaryForUnpaid,
  redactColorAnalysisForPreview,
} from "@/lib/entitlement";
import type { CompiledReport } from "@/types/report";

export const runtime = "nodejs";

/**
 * GET /api/reports/latest
 * Returns the user's most recent ready report for global style chat.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ report: null });

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("reports")
    .select("id, status, is_paid, face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, summary")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return NextResponse.json({ report: null });

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });

  const partial: Partial<CompiledReport> = {
    id: row.id,
    isPaid: hasPremium,
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: hasPremium
      ? row.color_analysis ?? undefined
      : redactColorAnalysisForPreview(row.color_analysis),
    skinAnalysis: hasPremium ? row.skin_analysis ?? undefined : undefined,
    features: hasPremium ? row.features ?? undefined : undefined,
    glasses: hasPremium ? row.glasses ?? undefined : undefined,
    hairstyle: hasPremium ? row.hairstyle ?? undefined : undefined,
    summary: hasPremium
      ? row.summary ?? undefined
      : previewSummaryForUnpaid(row.summary),
  };

  return NextResponse.json({
    report: {
      id: row.id,
      isPaid: hasPremium,
      partial,
    },
  });
}
