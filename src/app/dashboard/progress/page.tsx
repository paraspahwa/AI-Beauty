import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { ChevronLeft, TrendingUp } from "lucide-react";
import { ProgressTracker } from "@/components/ProgressTracker";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  SkinAnalysisResult,
} from "@/types/report";

export const dynamic = "force-dynamic";

export type ProgressReport = {
  id: string;
  created_at: string;
  color_analysis: ColorAnalysisResult | null;
  face_shape: FaceShapeResult | null;
  skin_analysis: SkinAnalysisResult | null;
  is_paid: boolean;
  status: string;
};

export default async function ProgressPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard/progress");

  const admin = createSupabaseAdminClient();
  const { data: rows } = await admin
    .from("reports")
    .select("id, created_at, color_analysis, face_shape, skin_analysis, is_paid, status")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: true });

  const reports = (rows ?? []) as ProgressReport[];

  return (
    <main className="container max-w-3xl py-10 sm:py-16 min-h-screen">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: "rgba(240,232,216,0.5)" }}
        >
          <ChevronLeft className="h-4 w-4" />
          My Reports
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="h-5 w-5" style={{ color: "#C9956B" }} />
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold" style={{ color: "#C8A96E" }}>
            ✦ Your Journey
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Progress Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(240,232,216,0.45)" }}>
          How your style profile has evolved across {reports.length} completed {reports.length === 1 ? "analysis" : "analyses"}.
        </p>
      </div>

      <ProgressTracker reports={reports} />
    </main>
  );
}
