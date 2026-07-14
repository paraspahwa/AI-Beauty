import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { Camera, FileText, Clock, CheckCircle2, AlertCircle, Lock, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteReportButton } from "@/components/DeleteReportButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardReportHint } from "@/lib/report/journey-hints";
import { ReferralProgram } from "@/components/referral/ReferralProgram";
import styles from "./dashboard.module.css";

type ReportRow = {
  id: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  summary: string | null;
  face_shape: { shape?: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge className={styles.badgePro}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
  if (status === "processing") return <Badge className={styles.badgeReport}><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
  if (status === "failed" || status === "error") return <Badge style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  return <Badge className={styles.badgeFree}><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard");

  const { data: reports } = await supabase
    .from("reports")
    .select("id, status, is_paid, created_at, summary, face_shape")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (reports ?? []) as ReportRow[];
  const isAdminPremium = hasPremiumAccess({ isPaid: false, userEmail: user.email });

  return (
    <main className={`min-h-app-viewport ${styles.pageBase}`}>
      <div className="page-bleed-x py-10 sm:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <PageHeader
            label="Dashboard"
            title="Your beauty reports"
            description={`${rows.length} analysis${rows.length !== 1 ? "es" : ""} in your history. Upload a new selfie anytime.`}
            actions={
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/vault">
                    <Archive className="h-4 w-4" />
                    Vault
                  </Link>
                </Button>
                <Button asChild variant="accent" size="sm">
                  <Link href="/upload">
                    <FileText className="h-4 w-4" />
                    New analysis
                  </Link>
                </Button>
              </>
            }
          />

          {rows.length === 0 ? (
            <div className={`text-center py-24 rounded-3xl ${styles.emptyState}`}>
              <Camera className="mx-auto mb-4 h-12 w-12 text-terracotta/40" />
              <h2 className="font-display text-2xl text-ink mb-2">No reports yet</h2>
              <p className="mb-6 text-ink-stone">Upload a selfie to get your personalized beauty analysis.</p>
              <Button asChild variant="accent">
                <Link href="/upload">Get started</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((report) => {
                const date = new Date(report.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const shape = report.face_shape?.shape ?? null;
                const hasPremium = report.is_paid || isAdminPremium;
                const nextHint = getDashboardReportHint({
                  status: report.status,
                  is_paid: report.is_paid,
                  hasPremium,
                });

                return (
                  <div
                    key={report.id}
                    className={`dossier-card flex flex-col justify-between gap-4 !p-5 sm:flex-row sm:items-center ${styles.reportCard}`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.iconBubble}`}>
                        <FileText className="h-5 w-5 text-terracotta/70" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={report.status} />
                          {!report.is_paid && !isAdminPremium && (
                            <Badge className={styles.badgeReport}>
                              <Lock className="h-3 w-3 mr-1" />Preview
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-sm font-medium text-ink">
                          {shape ? `${shape} face` : "Beauty Analysis"} — {date}
                        </p>
                        {report.summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-ink-stone">{report.summary}</p>
                        )}
                        <p className="mt-2 text-xs font-medium text-terracotta">
                          Next: {nextHint.detail ?? nextHint.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant={report.status === "ready" ? "accent" : "outline"} size="sm">
                        <Link href={`/report/${report.id}`}>View report</Link>
                      </Button>
                      <DeleteReportButton reportId={report.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Referral Program */}
          <div className="mt-12">
            <ReferralProgram />
          </div>

          {/* Vault link */}
          <div className="mt-8 text-center">
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 bg-terracotta/10 px-6 py-3 text-sm font-semibold text-terracotta transition hover:bg-terracotta/20"
            >
              <Archive className="h-4 w-4" />
              Browse your Vault — all saved infographics &amp; PDFs
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
