import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminUserEmail } from "@/lib/auth/access";
import { AdminCleanupButton } from "@/components/AdminCleanupButton";

interface CanaryRow {
  stage: string;
  variantId: string;
  runCount: number;
  degradedCount: number;
  avgDurationMs: number;
  degradationPct: number;
}

interface SummaryStats {
  totalReports: number;
  readyReports: number;
  failedReports: number;
  totalUsers: number;
  paidReports: number;
  conversionRate: number;
  estRevenueInr: number;
}

interface DailyBucket {
  date: string; // YYYY-MM-DD
  total: number;
  paid: number;
}

async function getAdminStats(): Promise<{
  canary: CanaryRow[];
  summary: SummaryStats;
  daily: DailyBucket[];
}> {
  const admin = createSupabaseAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [canaryRes, reportCountRes, failedCountRes, userPrefsCountRes, paidCountRes, dailyRes] =
    await Promise.all([
      admin.rpc("get_canary_stats"),
      admin
        .from("reports")
        .select("status", { count: "exact", head: false })
        .in("status", ["ready", "processing", "failed"]),
      admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("user_style_prefs").select("user_id", { count: "exact", head: true }),
      admin.from("reports").select("id", { count: "exact", head: true }).eq("is_paid", true),
      admin
        .from("reports")
        .select("created_at, is_paid")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true }),
    ]);

  const rows = (reportCountRes.data ?? []) as { status: string }[];
  const totalReports = rows.length;
  const readyReports = rows.filter((r) => r.status === "ready").length;
  const failedReports = failedCountRes.count ?? 0;
  const totalUsers = userPrefsCountRes.count ?? 0;
  const paidReports = paidCountRes.count ?? 0;
  const conversionRate = totalReports > 0 ? Math.round((paidReports / totalReports) * 100) : 0;
  const estRevenueInr = paidReports * 399; // base plan price ₹399

  // Build daily buckets from last 30 days
  const dailyMap: Record<string, DailyBucket> = {};
  for (const row of (dailyRes.data ?? []) as { created_at: string; is_paid: boolean }[]) {
    const date = row.created_at.slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { date, total: 0, paid: 0 };
    dailyMap[date].total++;
    if (row.is_paid) dailyMap[date].paid++;
  }
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const canary = ((canaryRes.data ?? []) as {
    stage: string;
    variant_id: string;
    run_count: number;
    degraded_count: number;
    avg_duration_ms: number;
    degradation_pct: number;
  }[]).map((r) => ({
    stage: r.stage,
    variantId: r.variant_id,
    runCount: r.run_count,
    degradedCount: r.degraded_count,
    avgDurationMs: r.avg_duration_ms,
    degradationPct: r.degradation_pct,
  }));

  return { canary, summary: { totalReports, readyReports, failedReports, totalUsers, paidReports, conversionRate, estRevenueInr }, daily };
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminUserEmail(user.email)) redirect("/");

  const { canary, summary, daily } = await getAdminStats();

  const stages = Array.from(new Set(canary.map((r) => r.stage))).sort();

  return (
    <main className="container max-w-5xl py-12 min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-medium mb-2" style={{ color: "#C9956B" }}>Admin</p>
          <h1 className="font-serif text-3xl text-ink">System Dashboard</h1>
        </div>
        <AdminCleanupButton />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total reports", value: summary.totalReports },
          { label: "Completed", value: summary.readyReports },
          { label: "Failed", value: summary.failedReports },
          { label: "Users w/ prefs", value: summary.totalUsers },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl p-5 text-center"
            style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-3xl font-serif text-ink">{value}</p>
            <p className="text-xs text-ink-stone mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue / conversion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Paid conversions", value: summary.paidReports, color: "#63A282", note: "reports unlocked" },
          { label: "Conversion rate", value: `${summary.conversionRate}%`, color: "#C9956B", note: "of total analyses" },
          { label: "Est. Revenue", value: `₹${summary.estRevenueInr.toLocaleString("en-IN")}`, color: "#E8C990", note: "at ₹399 base plan" },
        ].map(({ label, value, color, note }) => (
          <div
            key={label}
            className="rounded-2xl p-5 text-center"
            style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: `1px solid ${color}30` }}
          >
            <p className="text-3xl font-serif" style={{ color }}>{value}</p>
            <p className="text-xs font-medium mt-1" style={{ color }}>{label}</p>
            <p className="text-xs text-ink-stone mt-0.5">{note}</p>
          </div>
        ))}
      </div>

      {/* Daily activity bar chart (last 30 days) */}
      {daily.length > 0 && (
        <div
          className="rounded-3xl overflow-hidden mb-8"
          style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h2 className="text-ink font-medium">Daily activity — last 30 days</h2>
            <p className="text-xs text-ink-stone mt-1">Total analyses (light) and paid (dark) per day</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-end gap-1 h-28 overflow-x-auto">
              {(() => {
                const maxTotal = Math.max(...daily.map((d) => d.total), 1);
                return daily.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1" title={`${d.date}: ${d.total} total, ${d.paid} paid`}>
                    <div className="w-full rounded-t flex flex-col justify-end overflow-hidden" style={{ height: `${Math.max((d.total / maxTotal) * 96, 4)}px`, background: "rgba(201,149,107,0.25)" }}>
                      {d.paid > 0 && (
                        <div
                          className="w-full rounded-t"
                          style={{ height: `${(d.paid / d.total) * 100}%`, background: "#C9956B", minHeight: "3px" }}
                        />
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-3 rounded" style={{ background: "rgba(201,149,107,0.25)" }} />
                <span className="text-xs text-ink-stone">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-3 rounded" style={{ background: "#C9956B" }} />
                <span className="text-xs text-ink-stone">Paid</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canary stats table */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h2 className="text-ink font-medium">Prompt canary metrics</h2>
          <p className="text-xs text-ink-stone mt-1">Per-stage per-variant aggregates from completed reports</p>
        </div>

        {canary.length === 0 ? (
          <div className="px-6 py-12 text-center text-ink-stone text-sm">
            No variant data yet — run migration 0007 and complete some analyses.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Stage", "Variant", "Runs", "Degraded", "Degraded %", "Avg ms"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-ink-stone uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.flatMap((stage) => {
                  const rows = canary.filter((r) => r.stage === stage);
                  return rows.map((row, i) => (
                    <tr
                      key={`${row.stage}-${row.variantId}`}
                      style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <td className="px-5 py-3 text-ink font-mono text-xs">{i === 0 ? stage : ""}</td>
                      <td className="px-5 py-3 text-ink font-mono text-xs">{row.variantId}</td>
                      <td className="px-5 py-3 text-ink">{row.runCount}</td>
                      <td className="px-5 py-3 text-ink">{row.degradedCount}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: row.degradationPct > 20 ? "rgba(248,113,113,0.15)" : row.degradationPct > 5 ? "rgba(201,149,107,0.15)" : "rgba(123,110,158,0.15)",
                            color: row.degradationPct > 20 ? "#F87171" : row.degradationPct > 5 ? "#C9956B" : "#A69CC4",
                          }}
                        >
                          {row.degradationPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-stone">{row.avgDurationMs?.toLocaleString() ?? "—"} ms</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
