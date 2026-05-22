import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { getStudioEntitlement } from "@/lib/entitlement";
import { Camera, FileText, Clock, CheckCircle2, AlertCircle, Lock, Link2, Dna, Sparkles, TrendingUp, MessageCircle, Images, Crown } from "lucide-react";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard");

  const admin = createSupabaseAdminClient();

  // Batch style prefs and reports queries, plus entitlement lookup
  const [{ data: prefsRow }, { data: reports }, entitlement] = await Promise.all([
    admin
      .from("user_style_prefs")
      .select("color_season, face_shape, prefs")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("reports")
      .select("id, status, is_paid, created_at, summary, face_shape, share_token")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getStudioEntitlement(user.id),
  ]);

  const prefs = prefsRow as { color_season?: string | null; face_shape?: string | null; prefs?: { palette?: string[] } | null } | null;
  const rows = (reports ?? []) as ReportRow[];
  const isAdminPremium = hasPremiumAccess({ isPaid: false, userEmail: user.email });
  const tier = entitlement.tier;
  const latestReadyReport = rows.find((report) => report.status === "ready") ?? null;
  const params = searchParams ? await searchParams : {};
  const activeView = params.view === "history" ? "history" : "continue";

  const inFlightReports = rows.filter((report) => report.status === "processing");
  const failedReports = rows.filter((report) => report.status === "failed" || report.status === "error");
  const continueReports = [...inFlightReports, ...failedReports];
  if (latestReadyReport && !continueReports.some((report) => report.id === latestReadyReport.id)) {
    continueReports.push(latestReadyReport);
  }
  const historyReports = rows.filter(
    (report) => report.status === "ready" && report.id !== latestReadyReport?.id,
  );
  const activeReports = activeView === "continue" ? continueReports : historyReports;

  return (
    <main className="container max-w-4xl py-12 sm:py-20 min-h-screen">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <span className="section-label mb-3 inline-flex">Dashboard</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-2">Dashboard</h1>
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

      {/* Core next actions */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.18)" }}
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: "#EC4899" }}>Next best action</p>
          <p className="mt-2 text-base font-semibold text-ink">
            {latestReadyReport ? "Continue your latest report" : "Start your first analysis"}
          </p>
          <p className="mt-1 text-xs text-ink-stone">
            {latestReadyReport
              ? "Jump back into your latest result and continue with chat or try-ons."
              : "Upload one selfie and get your personalized Renovaara report."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="accent" size="sm">
              <Link href={latestReadyReport ? `/report/${latestReadyReport.id}` : "/upload"}>
                <Camera className="h-4 w-4" />
                {latestReadyReport ? "Continue report" : "Start analysis"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/studio-vault">
                <Images className="h-4 w-4" />
                My Looks
              </Link>
            </Button>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(123,110,158,0.08)", border: "1px solid rgba(123,110,158,0.18)" }}
          data-tour="style-chat"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: "#A69CC4" }}>Style profile</p>
          <p className="mt-2 text-base font-semibold text-ink">Understand your style trends</p>
          <p className="mt-1 text-xs text-ink-stone">
            View your Style DNA and progress timeline in one place.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/style-dna">
                <Dna className="h-4 w-4" />
                Style DNA
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/progress">
                <TrendingUp className="h-4 w-4" />
                Progress
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/dashboard/studio-vault"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.18)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(236,72,153,0.16)" }}>
            <Images className="h-5 w-5" style={{ color: "#EC4899" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">My Looks</p>
            <p className="text-xs text-ink-stone">All report + studio creations in one place</p>
          </div>
        </Link>
        <Link
          href="/studio"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{ background: "linear-gradient(135deg,rgba(236,72,153,0.10),rgba(201,149,107,0.08))", border: "1px solid rgba(236,72,153,0.18)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(236,72,153,0.16)" }}>
            <Sparkles className="h-5 w-5" style={{ color: "#EC4899" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Try Studio Canvas</p>
            <p className="text-xs text-ink-stone">Quick scan, makeup, hair, outfits</p>
          </div>
        </Link>
      </div>

      {tier !== "studio_pro" && (
        <div
          className="mb-6 rounded-2xl px-5 py-4"
          style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.10),rgba(109,40,217,0.06))", border: "1px solid rgba(139,92,246,0.22)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Need more generations?</p>
              <p className="text-xs text-ink-stone">Upgrade only when you need higher monthly limits.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/upload?intent=studio">Upgrade to Studio Pro</Link>
            </Button>
          </div>
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard?view=continue"
              className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: activeView === "continue" ? "rgba(236,72,153,0.14)" : "rgba(255,255,255,0.7)",
                border: activeView === "continue" ? "1px solid rgba(236,72,153,0.35)" : "1px solid rgba(131,24,67,0.14)",
                color: activeView === "continue" ? "#EC4899" : "#3D2B1F",
                boxShadow: activeView === "continue" ? "0 0 0 2px rgba(236,72,153,0.12)" : "none",
              }}
            >
              Continue ({continueReports.length})
            </Link>
            <Link
              href="/dashboard?view=history"
              className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: activeView === "history" ? "rgba(123,110,158,0.14)" : "rgba(255,255,255,0.7)",
                border: activeView === "history" ? "1px solid rgba(123,110,158,0.35)" : "1px solid rgba(131,24,67,0.14)",
                color: activeView === "history" ? "#7B6E9E" : "#3D2B1F",
                boxShadow: activeView === "history" ? "0 0 0 2px rgba(123,110,158,0.12)" : "none",
              }}
            >
              History ({historyReports.length})
            </Link>
          </div>

          {activeReports.length === 0 ? (
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,247,251,0.92)", border: "1px solid rgba(131,24,67,0.14)" }}>
              <p className="text-sm text-ink font-medium">
                {activeView === "continue"
                  ? "You are all caught up."
                  : "No older completed reports yet."}
              </p>
              <p className="mt-1 text-xs text-ink-stone">
                {activeView === "continue"
                  ? "Start a new analysis anytime to get fresh recommendations."
                  : "Your previous completed reports will appear here as your history grows."}
              </p>
            </div>
          ) : (
            activeReports.map((report) => {
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
          }))}
        </div>
      )}
      </div>
      <DashboardTour />
    </main>
  );
}
