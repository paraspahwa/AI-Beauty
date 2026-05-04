import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { Camera, FileText, Clock, CheckCircle2, AlertCircle, Lock, Link2, Dna, Sparkles, TrendingUp, ShoppingBag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteReportButton } from "@/components/DeleteReportButton";

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
  if (status === "processing") return <Badge style={{ background: "rgba(201,149,107,0.12)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.25)" }}><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
  if (status === "failed" || status === "error") return <Badge style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  return <Badge style={{ background: "rgba(255,255,255,0.06)", color: "rgba(240,232,216,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
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

      {/* Feature quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/dashboard/progress"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
          style={{ background: "rgba(99,162,130,0.08)", border: "1px solid rgba(99,162,130,0.18)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(99,162,130,0.18)" }}>
            <TrendingUp className="h-5 w-5" style={{ color: "#63A282" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#F0E8D8" }}>Progress Tracker</p>
            <p className="text-xs" style={{ color: "rgba(240,232,216,0.45)" }}>See how your style profile has evolved</p>
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
            <p className="text-sm font-semibold" style={{ color: "#F0E8D8" }}>Wardrobe Capsule</p>
            <p className="text-xs" style={{ color: "rgba(240,232,216,0.45)" }}>Your 10-piece seasonal wardrobe edit</p>
          </div>
        </Link>
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
              <Dna className="h-5 w-5" style={{ color: "#C9956B" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#F0E8D8" }}>
                {prefs.color_season} · {prefs.face_shape ?? "Style DNA"}
              </p>
              <p className="text-xs" style={{ color: "rgba(240,232,216,0.45)" }}>
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
                      {report.share_token && (
                        <Badge style={{ background: "rgba(99,179,237,0.1)", color: "#63B3ED", border: "1px solid rgba(99,179,237,0.2)" }}>
                          <Link2 className="h-3 w-3 mr-1" />Shared
                        </Badge>
                      )}
                      {!report.is_paid && !isAdminPremium && (
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
    </main>
  );
}
