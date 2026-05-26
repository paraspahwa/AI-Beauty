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
import styles from "./dashboard.module.css";

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
  if (status === "ready") return <Badge className={styles.badgePro}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
  if (status === "processing") return <Badge className={styles.badgeReport}><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
  if (status === "failed" || status === "error") return <Badge style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  return <Badge className={styles.badgeFree}><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
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
    <main className={`min-h-screen ${styles.pageBase}`}>
      <div className="container max-w-5xl py-10 sm:py-16">
        <div className={`mb-10 rounded-[2rem] border p-5 sm:p-6 ${styles.heroCard}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-label mb-3 inline-flex">Dashboard</span>
              <h1 className="font-sans text-3xl sm:text-4xl text-ink mb-2">Your style workspace</h1>
              <p className="text-ink-stone max-w-2xl">
                {rows.length} analysis{rows.length !== 1 ? "es" : ""} in your history, plus studio tools, saved looks, and the next best action.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {tier === "studio_pro" ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles.tierPillPro}`}>
                    <Crown className="h-3 w-3" /> Studio Pro
                  </span>
                ) : tier === "report" ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles.tierPillReport}`}>
                    <FileText className="h-3 w-3" /> Report
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles.tierPillFree}`}>
                    Free
                  </span>
                )}
              </div>
            </div>
            <div data-tour="upload-cta" className="flex flex-wrap gap-3">
              <Button asChild variant="accent" size="sm">
                <Link href="/studio">
                  <Sparkles className="h-4 w-4" />
                  Open AI Studio
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/upload">
                  <FileText className="h-4 w-4" />
                  Create report
                </Link>
              </Button>
            </div>
          </div>
        </div>

      {/* Core next actions */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div
          className={`rounded-2xl p-5 ${styles.tileSurface}`}
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-ink">Primary workspace</p>
          <p className="mt-2 text-base font-semibold text-ink">
            {latestReadyReport ? "Continue in AI Studio" : "Start in AI Studio"}
          </p>
          <p className="mt-1 text-xs text-ink-stone">
            {latestReadyReport
              ? "Jump back into try-ons, saved looks, and fast experiments from your latest analysis."
              : "Start with one selfie, test looks quickly, and create a full report only when you need deeper guidance."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="accent" size="sm">
              <Link href={latestReadyReport ? `/report/${latestReadyReport.id}?tab=studio` : "/studio"}>
                <Sparkles className="h-4 w-4" />
                {latestReadyReport ? "Continue Studio" : "Open Studio"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/upload">
                <FileText className="h-4 w-4" />
                Create report
              </Link>
            </Button>
          </div>
        </div>

        <div
          className={`rounded-2xl p-5 ${styles.tileSurfaceAlt}`}
          data-tour="style-chat"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: "#7B6E9E" }}>Guided help</p>
          <p className="mt-2 text-base font-semibold text-ink">Get deeper advice when you need it</p>
          <p className="mt-1 text-xs text-ink-stone">
            Use your full report for detailed reasoning, saved tips, and longer-term style guidance.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={latestReadyReport ? `/report/${latestReadyReport.id}?chat=1` : "/upload"}>
                <MessageCircle className="h-4 w-4" />
                {latestReadyReport ? "Ask stylist" : "Create report first"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/style-dna">
                <Dna className="h-4 w-4" />
                Style DNA
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/dashboard/studio-vault"
          className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group ${styles.surfaceCard}`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(17,24,39,0.16)" }}>
            <Images className="h-5 w-5 text-[#111827]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">My Looks</p>
            <p className="text-xs text-ink-stone">All report + studio creations in one place</p>
          </div>
        </Link>
        <Link
          href="/upload"
          className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group ${styles.secondaryCard}`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(17,24,39,0.16)" }}>
            <FileText className="h-5 w-5 text-[#111827]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Create Full Report</p>
            <p className="text-xs text-ink-stone">Deeper analysis, recommendations, and guided chat</p>
          </div>
        </Link>
      </div>

      {tier !== "studio_pro" && (
        <div
          className={`mb-6 rounded-2xl px-5 py-4 ${styles.softSurfaceAlt}`}
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
            background: "linear-gradient(135deg, rgba(17,24,39,0.14) 0%, rgba(17,24,39,0.08) 100%)",
            border: "1px solid rgba(17,24,39,0.2)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
              style={{ background: "rgba(17,24,39,0.2)" }}
            >
              <Dna className="h-5 w-5" style={{ color: "#111827" }} />
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
        <div className={`text-center py-24 rounded-3xl ${styles.emptyState}`}>
          <Camera className="h-12 w-12 mx-auto mb-4 text-[rgba(17,24,39,0.3)]" />
          <h2 className="font-sans text-2xl text-ink mb-2">No reports yet</h2>
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
                background: activeView === "continue" ? "rgba(17,24,39,0.14)" : "rgba(255,255,255,0.7)",
                border: activeView === "continue" ? "1px solid rgba(17,24,39,0.35)" : "1px solid rgba(17,24,39,0.14)",
                color: activeView === "continue" ? "#111827" : "#3D2B1F",
                boxShadow: activeView === "continue" ? "0 0 0 2px rgba(17,24,39,0.12)" : "none",
              }}
            >
              Continue ({continueReports.length})
            </Link>
            <Link
              href="/dashboard?view=history"
              className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: activeView === "history" ? "rgba(17,24,39,0.14)" : "rgba(255,255,255,0.7)",
                border: activeView === "history" ? "1px solid rgba(17,24,39,0.35)" : "1px solid rgba(17,24,39,0.14)",
                color: activeView === "history" ? "#7B6E9E" : "#3D2B1F",
                boxShadow: activeView === "history" ? "0 0 0 2px rgba(17,24,39,0.12)" : "none",
              }}
            >
              History ({historyReports.length})
            </Link>
          </div>

          {activeReports.length === 0 ? (
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,247,251,0.92)", border: "1px solid rgba(17,24,39,0.14)" }}>
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
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${styles.reportCard}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-full ${styles.iconBubble}`}>
                    <FileText className="h-5 w-5 text-[rgba(17,24,39,0.5)]" />
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
                        <Badge style={{ background: "rgba(17,24,39,0.12)", color: "#111827", border: "1px solid rgba(17,24,39,0.25)" }}>
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
                        <span className="hidden sm:inline">Ask stylist</span>
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
