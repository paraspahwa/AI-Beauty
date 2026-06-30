import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { Camera, FileText, Clock, CheckCircle2, AlertCircle, Lock, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteReportButton } from "@/components/DeleteReportButton";
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
        <div className={`mb-10 rounded-[2rem] border p-5 sm:p-6 ${styles.heroCard}`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <span className="section-label mb-3 inline-flex">Dashboard</span>
              <h1 className="font-sans text-3xl sm:text-4xl text-ink mb-2">Your beauty reports</h1>
              <p className="text-ink-stone max-w-2xl">
                {rows.length} analysis{rows.length !== 1 ? "es" : ""} in your history. Upload a new selfie anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
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
            </div>
          </div>
        </div>

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
            {rows.map((report) => {
              const date = new Date(report.created_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
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
                        {!report.is_paid && !isAdminPremium && (
                          <Badge style={{ background: "rgba(17,24,39,0.12)", color: "#111827", border: "1px solid rgba(17,24,39,0.25)" }}>
                            <Lock className="h-3 w-3 mr-1" />Preview
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
                    <DeleteReportButton reportId={report.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
