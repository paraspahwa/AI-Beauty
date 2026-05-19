import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { getStudioEntitlement } from "@/lib/entitlement";
import { Camera, FileText, Clock, CheckCircle2, AlertCircle, Lock, Link2, Dna, Sparkles, TrendingUp, ShoppingBag, MessageCircle, Images, Crown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteReportButton } from "@/components/DeleteReportButton";
import { DashboardTour } from "@/components/TourProvider";

type ReportRow = {
  id: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  summary: string | null;
  face_shape: { shape?: string } | null;
  share_token: string | null;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge style={{ background: "rgba(123,110,158,0.15)", color: "#A69CC4", border: "1px solid rgba(123,110,158,0.25)" }}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
  if (status === "processing") return <Badge style={{ background: "rgba(201,149,107,0.12)", color: "#EC4899", border: "1px solid rgba(201,149,107,0.25)" }}><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
  if (status === "failed" || status === "error") return <Badge style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  return <Badge style={{ background: "rgba(131,24,67,0.14)", color: "rgba(131,24,67,0.62)", border: "1px solid rgba(131,24,67,0.18)" }}><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard");

  // Fetch style prefs for DNA teaser
  const admin = createSupabaseAdminClient();
  const { data: prefsRow } = await admin
    .from("user_style_prefs")
    .select("color_season, face_shape, skin_type, prefs")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs = prefsRow as { color_season?: string | null; face_shape?: string | null; skin_type?: string | null; prefs?: { palette?: string[] } | null } | null;

  const { data: reports } = await supabase
    .from("reports")
    .select("id, status, is_paid, created_at, summary, face_shape, share_token")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (reports ?? []) as ReportRow[];
  const isAdminPremium = hasPremiumAccess({ isPaid: false, userEmail: user.email });
  const entitlement = await getStudioEntitlement(user.id);
  const tier = entitlement.tier;

  return (
    <main className="container max-w-4xl py-12 sm:py-20 min-h-screen">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <span className="section-label mb-3 inline-flex">Dashboard</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-2">My Reports</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-ink-stone">{rows.length} analysis{rows.length !== 1 ? "es" : ""} in your history</p>
            {tier === "studio_pro" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
                <Crown className="h-3 w-3" /> Studio Pro
              </span>
            ) : tier === "report" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(236,72,153,0.12)", color: "#EC4899", border: "1px solid rgba(236,72,153,0.25)" }}>
                <FileText className="h-3 w-3" /> Report
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(131,24,67,0.10)", color: "rgba(131,24,67,0.55)", border: "1px solid rgba(131,24,67,0.18)" }}>
                Free
              </span>
            )}
          </div>
        </div>
        <div data-tour="upload-cta">
          <Button asChild variant="accent" size="sm">
            <Link href="/upload">
              <Camera className="h-4 w-4" />
              New analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Feature quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link
          href="/dashboard/progress"
          data-tour="style-chat"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.18)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(236,72,153,0.16)" }}>
            <TrendingUp className="h-5 w-5" style={{ color: "#EC4899" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Progress Tracker</p>
            <p className="text-xs text-ink-stone">See how your style profile has evolved</p>
          </div>
        </Link>
        <Link
          href="/dashboard/wardrobe-capsule"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{ background: "rgba(123,110,158,0.08)", border: "1px solid rgba(123,110,158,0.18)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(123,110,158,0.18)" }}>
            <ShoppingBag className="h-5 w-5" style={{ color: "#A69CC4" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Wardrobe Capsule</p>
            <p className="text-xs text-ink-stone">Your 10-piece seasonal wardrobe edit</p>
          </div>
        </Link>
        <Link
          href="/dashboard/vault"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.18)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(236,72,153,0.16)" }}>
            <Images className="h-5 w-5" style={{ color: "#EC4899" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Image Vault</p>
            <p className="text-xs text-ink-stone">All generated looks with date and time</p>
          </div>
        </Link>
        <div
          className="flex items-center gap-4 rounded-2xl px-5 py-4"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px dashed rgba(16,185,129,0.28)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(16,185,129,0.16)" }}>
            <Clock className="h-5 w-5" style={{ color: "#10B981" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Routine Tracker</p>
            <p className="text-xs text-ink-stone">Daily AM/PM check-ins and streaks (coming soon)</p>
          </div>
        </div>
        <div
          className="flex items-center gap-4 rounded-2xl px-5 py-4"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px dashed rgba(59,130,246,0.28)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(59,130,246,0.16)" }}>
            <Images className="h-5 w-5" style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Community Gallery</p>
            <p className="text-xs text-ink-stone">Inspiration looks and public style boards (coming soon)</p>
          </div>
        </div>
        {tier !== "studio_pro" && (
          <Link
            href="/upload?intent=studio"
            className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.10),rgba(109,40,217,0.06))", border: "1px solid rgba(139,92,246,0.22)" }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(139,92,246,0.18)" }}>
              <Wand2 className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Upgrade to Studio Pro</p>
              <p className="text-xs text-ink-stone">150 AI gens/mo · Unlimited reports</p>
            </div>
          </Link>
        )}
      </div>

      {/* Style DNA teaser — shown when prefs exist */}
      {prefs?.color_season && (
        <Link
          href="/dashboard/style-dna"
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{
            background: "linear-gradient(135deg, rgba(201,149,107,0.14) 0%, rgba(123,110,158,0.08) 100%)",
            border: "1px solid rgba(201,149,107,0.2)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
              style={{ background: "rgba(201,149,107,0.2)" }}
            >
              <Dna className="h-5 w-5" style={{ color: "#EC4899" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {prefs.color_season} · {prefs.face_shape ?? "Style DNA"}
              </p>
              <p className="text-xs text-ink-stone">
                View your full Style DNA profile
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* mini swatches */}
            {(prefs.prefs?.palette ?? []).slice(0, 3).map((hex) => (
              <div
                key={hex}
                className="h-5 w-5 rounded-full"
                style={{ background: hex, border: "1px solid rgba(255,255,255,0.12)" }}
              />
            ))}
            <Sparkles className="h-4 w-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: "#C8A96E" }} />
          </div>
        </Link>
      )}

      <div data-tour="reports-list">
      {rows.length === 0 ? (
        <div className="text-center py-24 rounded-3xl" style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.92), rgba(251,231,242,0.78))", border: "1px dashed rgba(131,24,67,0.20)" }}>
          <Camera className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(131,24,67,0.3)" }} />
          <h2 className="font-serif text-2xl text-ink mb-2">No reports yet</h2>
          <p className="text-ink-stone mb-6">Upload a selfie to get your personalized beauty analysis.</p>
          <Button asChild variant="accent">
            <Link href="/upload">Get started</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((report) => {
            const date = new Date(report.created_at).toLocaleDateString("en-IN", {
              year: "numeric", month: "short", day: "numeric",
            });
            const shape = report.face_shape?.shape ?? null;

            return (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(131,24,67,0.14)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "rgba(251,231,242,0.92)", border: "1px solid rgba(131,24,67,0.14)" }}>
                    <FileText className="h-5 w-5" style={{ color: "rgba(131,24,67,0.5)" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusBadge status={report.status} />
                      {report.share_token && (
                        <Badge style={{ background: "rgba(99,179,237,0.1)", color: "#63B3ED", border: "1px solid rgba(99,179,237,0.2)" }}>
                          <Link2 className="h-3 w-3 mr-1" />Shared
                        </Badge>
                      )}
                      {!report.is_paid && !isAdminPremium && (
                        <Badge style={{ background: "rgba(201,149,107,0.12)", color: "#EC4899", border: "1px solid rgba(201,149,107,0.25)" }}>
                          <Lock className="h-3 w-3 mr-1" />Free preview
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-ink font-medium truncate">
                      {shape ? `${shape} face` : "Beauty Analysis"} — {date}
                    </p>
                    {report.summary && (
                      <p className="text-xs text-ink-stone mt-1 line-clamp-2">{report.summary}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild variant={report.status === "ready" ? "accent" : "outline"} size="sm">
                    <Link href={`/report/${report.id}`}>View report</Link>
                  </Button>
                  {report.status === "ready" && (
                    <Button asChild variant="outline" size="sm" title="Open style chat">
                      <Link href={`/report/${report.id}?chat=1`}>
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <DeleteReportButton reportId={report.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      <DashboardTour />
    </main>
  );
}
