import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { Dna, ChevronLeft, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StyleDnaCard } from "@/components/StyleDnaCard";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  SkinAnalysisResult,
  HairstyleResult,
} from "@/types/report";

export const dynamic = "force-dynamic";

type StylePrefsRow = {
  color_season: string | null;
  undertone: string | null;
  face_shape: string | null;
  skin_type: string | null;
  prefs: {
    metals?: string[];
    palette?: string[]; // top 3 hex
  } | null;
  updated_at: string;
};

type LatestReportRow = {
  id: string;
  created_at: string;
  color_analysis: ColorAnalysisResult | null;
  face_shape: FaceShapeResult | null;
  skin_analysis: SkinAnalysisResult | null;
  hairstyle: HairstyleResult | null;
};

export default async function StyleDnaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard/style-dna");

  // Fetch user_style_prefs (aggregated across all analyses)
  const admin = createSupabaseAdminClient();
  const { data: prefsRow } = await admin
    .from("user_style_prefs")
    .select("color_season, undertone, face_shape, skin_type, prefs, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs = prefsRow as StylePrefsRow | null;

  // Fetch latest ready report for richer data (palette names, routines, etc.)
  const { data: latestReport } = await admin
    .from("reports")
    .select("id, created_at, color_analysis, face_shape, skin_analysis, hairstyle")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestReport as LatestReportRow | null;

  // Count total analyses
  const { count: totalCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasData = !!prefs?.color_season || !!latest;

  return (
    <main className="container max-w-3xl py-10 sm:py-16 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: "rgba(240,232,216,0.5)" }}
        >
          <ChevronLeft className="h-4 w-4" />
          My Reports
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dna className="h-5 w-5" style={{ color: "#C9956B" }} />
              <span
                className="text-[10px] uppercase tracking-[0.35em] font-semibold"
                style={{ color: "#C8A96E" }}
              >
                ✦ Style Profile
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink">
              Your Style DNA
            </h1>
            {totalCount != null && (
              <p className="mt-1 text-sm" style={{ color: "rgba(240,232,216,0.45)" }}>
                Derived from {totalCount} analysis{totalCount !== 1 ? "es" : ""}
                {prefs?.updated_at
                  ? ` · Last updated ${new Date(prefs.updated_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`
                  : ""}
              </p>
            )}
          </div>
          <Button asChild variant="accent" size="sm">
            <Link href="/upload">
              <Sparkles className="h-3.5 w-3.5" />
              New analysis
            </Link>
          </Button>
        </div>
      </div>

      {!hasData ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center gap-4 py-24 rounded-3xl text-center"
          style={{
            background: "linear-gradient(145deg, rgba(18,18,26,0.8), rgba(26,26,38,0.6))",
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <Dna className="h-14 w-14 opacity-20" style={{ color: "#C9956B" }} />
          <h2 className="font-serif text-2xl text-ink">No style data yet</h2>
          <p style={{ color: "rgba(240,232,216,0.45)" }} className="text-sm max-w-xs">
            Complete your first beauty analysis to unlock your Style DNA profile.
          </p>
          <Button asChild variant="accent">
            <Link href="/upload">Get my report</Link>
          </Button>
        </div>
      ) : (
        <StyleDnaCard
          prefs={prefs}
          latest={latest}
          userEmail={user.email ?? ""}
        />
      )}
    </main>
  );
}
