import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { WardrobeCapsuleCard } from "@/components/WardrobeCapsuleCard";
import type { ColorAnalysisResult, SkinAnalysisResult } from "@/types/report";

export const dynamic = "force-dynamic";

type StylePrefsRow = {
  color_season: string | null;
  undertone: string | null;
  skin_type: string | null;
  prefs: { metals?: string[]; palette?: string[] } | null;
};

type LatestReportData = {
  color_analysis: ColorAnalysisResult | null;
  skin_analysis: SkinAnalysisResult | null;
};

export default async function WardrobeCapsulePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard/wardrobe-capsule");

  const admin = createSupabaseAdminClient();

  const [{ data: prefsRow }, { data: latestRow }] = await Promise.all([
    admin
      .from("user_style_prefs")
      .select("color_season, undertone, skin_type, prefs")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("reports")
      .select("color_analysis, skin_analysis")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const prefs = prefsRow as StylePrefsRow | null;
  const latest = latestRow as LatestReportData | null;

  const hasData = !!prefs?.color_season || !!latest?.color_analysis;

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
          <ShoppingBag className="h-5 w-5" style={{ color: "#C9956B" }} />
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold" style={{ color: "#C8A96E" }}>
            ✦ Wardrobe Edit
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Seasonal Wardrobe Capsule</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(240,232,216,0.45)" }}>
          A curated 10-piece wardrobe built around your personal colour season and skin profile.
        </p>
      </div>

      {!hasData ? (
        <div
          className="flex flex-col items-center justify-center gap-4 py-24 rounded-3xl text-center"
          style={{ background: "linear-gradient(145deg,rgba(18,18,26,0.8),rgba(26,26,38,0.6))", border: "1px dashed rgba(255,255,255,0.1)" }}
        >
          <ShoppingBag className="h-14 w-14 opacity-20" style={{ color: "#C9956B" }} />
          <h2 className="font-serif text-2xl text-ink">No style data yet</h2>
          <p className="text-sm max-w-xs" style={{ color: "rgba(240,232,216,0.45)" }}>
            Complete your first beauty analysis to unlock your personalised capsule wardrobe.
          </p>
          <Link
            href="/upload"
            className="rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F" }}
          >
            Get my report
          </Link>
        </div>
      ) : (
        <WardrobeCapsuleCard prefs={prefs} latest={latest} />
      )}
    </main>
  );
}
