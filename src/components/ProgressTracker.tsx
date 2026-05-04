"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import type { ProgressReport } from "@/app/dashboard/progress/page";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function SeasonDot({ season }: { season: string }) {
  const warm = ["Spring", "Autumn"].some((s) => season.includes(s));
  const bg = warm ? "#C9956B" : "#7B6E9E";
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ background: bg, boxShadow: `0 0 6px ${bg}80` }}
    />
  );
}

function ConsistencyBadge({ pct }: { pct: number }) {
  const bg = pct >= 80 ? "rgba(99,162,130,0.15)" : pct >= 50 ? "rgba(201,149,107,0.15)" : "rgba(248,113,113,0.12)";
  const color = pct >= 80 ? "#63A282" : pct >= 50 ? "#C9956B" : "#F87171";
  const label = pct >= 80 ? "Consistent ✓" : pct >= 50 ? "Evolving" : "Varied";
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
      style={{ background: bg, color }}
    >
      {label} {pct}%
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  reports: ProgressReport[];
}

export function ProgressTracker({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-24 rounded-3xl text-center"
        style={{ background: "linear-gradient(145deg,rgba(18,18,26,0.8),rgba(26,26,38,0.6))", border: "1px dashed rgba(255,255,255,0.1)" }}
      >
        <TrendingUp className="h-14 w-14 opacity-20" style={{ color: "#C9956B" }} />
        <h2 className="font-serif text-2xl text-ink">No completed analyses yet</h2>
        <p className="text-sm max-w-xs" style={{ color: "rgba(240,232,216,0.45)" }}>
          Complete your first beauty analysis and return here to track how your style profile evolves.
        </p>
        <a
          href="/upload"
          className="rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F" }}
        >
          Get my report
        </a>
      </div>
    );
  }

  if (reports.length === 1) {
    const r = reports[0];
    const season = r.color_analysis?.season;
    const shape  = r.face_shape?.shape;
    const skin   = r.skin_analysis?.type;
    return (
      <div
        className="rounded-3xl p-6 space-y-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-sm" style={{ color: "rgba(240,232,216,0.6)" }}>
          You have <strong style={{ color: "#F0E8D8" }}>1 analysis</strong>. Complete a second one to see how your profile evolves over time!
        </p>
        <div className="flex flex-wrap gap-3">
          {season && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(201,149,107,0.1)", border: "1px solid rgba(201,149,107,0.2)" }}>
              <SeasonDot season={season} />
              <span className="text-sm" style={{ color: "#F0E8D8" }}>{season}</span>
            </div>
          )}
          {shape && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(123,110,158,0.1)", border: "1px solid rgba(123,110,158,0.2)" }}>
              <span className="text-sm" style={{ color: "#F0E8D8" }}>{shape} face</span>
            </div>
          )}
          {skin && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(99,162,130,0.1)", border: "1px solid rgba(99,162,130,0.2)" }}>
              <span className="text-sm" style={{ color: "#F0E8D8" }}>{skin} skin</span>
            </div>
          )}
        </div>
        <a href="/upload" className="inline-flex items-center gap-1 text-sm hover:opacity-70 transition-opacity" style={{ color: "#C9956B" }}>
          Add another analysis <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // ── Multi-report analytics ────────────────────────────────────────────────
  const seasons   = reports.map((r) => r.color_analysis?.season ?? null).filter(Boolean) as string[];
  const shapes    = reports.map((r) => r.face_shape?.shape ?? null).filter(Boolean) as string[];
  const skinTypes = reports.map((r) => r.skin_analysis?.type ?? null).filter(Boolean) as string[];

  function consistency(arr: string[]) {
    if (!arr.length) return 0;
    const counts = arr.reduce<Record<string, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});
    const maxCount = Math.max(...Object.values(counts));
    return Math.round((maxCount / arr.length) * 100);
  }

  function dominant(arr: string[]) {
    if (!arr.length) return null;
    const counts = arr.reduce<Record<string, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  const seasonConsistency  = consistency(seasons);
  const shapeConsistency   = consistency(shapes);
  const skinConsistency    = consistency(skinTypes);
  const dominantSeason     = dominant(seasons);
  const dominantShape      = dominant(shapes);
  const dominantSkin       = dominant(skinTypes);

  // Skin concern trend
  const allConcerns = reports.flatMap((r) => r.skin_analysis?.concerns ?? []);
  const concernCounts = allConcerns.reduce<Record<string, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});
  const topConcerns = Object.entries(concernCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Summary consistency cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid sm:grid-cols-3 gap-4"
      >
        {dominantSeason && (
          <div
            className="rounded-2xl p-5 space-y-2"
            style={{ background: "rgba(201,149,107,0.07)", border: "1px solid rgba(201,149,107,0.15)" }}
          >
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>Colour Season</p>
            <div className="flex items-center gap-2">
              <SeasonDot season={dominantSeason} />
              <p className="font-serif text-lg" style={{ color: "#F0E8D8" }}>{dominantSeason}</p>
            </div>
            <ConsistencyBadge pct={seasonConsistency} />
          </div>
        )}
        {dominantShape && (
          <div
            className="rounded-2xl p-5 space-y-2"
            style={{ background: "rgba(123,110,158,0.07)", border: "1px solid rgba(123,110,158,0.15)" }}
          >
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>Face Shape</p>
            <p className="font-serif text-lg" style={{ color: "#F0E8D8" }}>{dominantShape}</p>
            <ConsistencyBadge pct={shapeConsistency} />
          </div>
        )}
        {dominantSkin && (
          <div
            className="rounded-2xl p-5 space-y-2"
            style={{ background: "rgba(99,162,130,0.07)", border: "1px solid rgba(99,162,130,0.15)" }}
          >
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>Skin Type</p>
            <p className="font-serif text-lg" style={{ color: "#F0E8D8" }}>{dominantSkin}</p>
            <ConsistencyBadge pct={skinConsistency} />
          </div>
        )}
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-sm font-medium text-ink">Analysis timeline</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(240,232,216,0.35)" }}>Changes across your {reports.length} analyses</p>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {reports.map((r, i) => {
            const season = r.color_analysis?.season;
            const shape  = r.face_shape?.shape;
            const skin   = r.skin_analysis?.type;
            const concerns = r.skin_analysis?.concerns ?? [];
            const prevSeason = i > 0 ? reports[i - 1].color_analysis?.season : null;
            const seasonChanged = prevSeason && season && prevSeason !== season;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-start gap-4 px-5 py-4"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: i === reports.length - 1 ? "#C9956B" : "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.1)" }}
                  />
                  {i < reports.length - 1 && <div className="w-px flex-1 min-h-4" style={{ background: "rgba(255,255,255,0.07)" }} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs" style={{ color: "rgba(240,232,216,0.4)" }}>{fmt(r.created_at)}</p>
                    {i === reports.length - 1 && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: "rgba(201,149,107,0.15)", color: "#C9956B" }}>
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {season && (
                      <div className="flex items-center gap-1.5">
                        <SeasonDot season={season} />
                        <span className="text-sm" style={{ color: "#F0E8D8" }}>{season}</span>
                        {seasonChanged && (
                          <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "rgba(248,200,100,0.15)", color: "#E8C990" }}>
                            changed ↑
                          </span>
                        )}
                      </div>
                    )}
                    {shape && <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "rgba(123,110,158,0.12)", color: "#A69CC4" }}>{shape}</span>}
                    {skin && <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "rgba(99,162,130,0.12)", color: "#63A282" }}>{skin}</span>}
                  </div>
                  {concerns.length > 0 && (
                    <p className="text-xs mt-1.5" style={{ color: "rgba(240,232,216,0.35)" }}>
                      Concerns: {concerns.join(", ")}
                    </p>
                  )}
                  <a
                    href={`/report/${r.id}`}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                    style={{ color: "rgba(240,232,216,0.3)" }}
                  >
                    View report <ChevronRight className="h-3 w-3" />
                  </a>
                </div>

                {/* Status icon */}
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-1" style={{ color: "rgba(99,162,130,0.5)" }} />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Skin concerns trend */}
      {topConcerns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>
            Recurring skin concerns
          </p>
          <div className="space-y-2">
            {topConcerns.map(([concern, count]) => (
              <div key={concern} className="flex items-center gap-3">
                <span className="text-sm flex-1" style={{ color: "#F0E8D8" }}>{concern}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full overflow-hidden w-24" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / reports.length) * 100}%`, background: "#C9956B" }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right" style={{ color: "rgba(240,232,216,0.4)" }}>
                    {count}/{reports.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
