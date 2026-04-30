import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Camera, FileText, Clock, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ReportRow = {
  id: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  summary: string | null;
  face_shape: { shape?: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") return <Badge style={{ background: "rgba(123,110,158,0.15)", color: "#A69CC4", border: "1px solid rgba(123,110,158,0.25)" }}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
  if (status === "processing") return <Badge style={{ background: "rgba(201,149,107,0.12)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.25)" }}><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
  if (status === "error") return <Badge style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
  return <Badge style={{ background: "rgba(255,255,255,0.06)", color: "rgba(240,232,216,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
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

  return (
    <main className="container max-w-4xl py-12 sm:py-20 min-h-screen">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-2">My Reports</h1>
          <p className="text-ink-stone">{rows.length} analysis{rows.length !== 1 ? "es" : ""} in your history</p>
        </div>
        <Button asChild variant="accent" size="sm">
          <Link href="/upload">
            <Camera className="h-4 w-4" />
            New analysis
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 rounded-3xl" style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.8), rgba(26,26,38,0.6))", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Camera className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.2)" }} />
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
                style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "rgba(26,26,38,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <FileText className="h-5 w-5" style={{ color: "rgba(240,232,216,0.4)" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusBadge status={report.status} />
                      {!report.is_paid && (
                        <Badge style={{ background: "rgba(201,149,107,0.12)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.25)" }}>
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
                <Button asChild variant={report.status === "ready" ? "accent" : "outline"} size="sm" className="shrink-0">
                  <Link href={`/report/${report.id}`}>View report</Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
