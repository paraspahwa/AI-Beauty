"use client";

import { useRef, useState } from "react";

// ── Types matching the backend NDJSON events ─────────────────────────────────

type DebugEvent =
  | { type: "auth_ok"; email: string }
  | { type: "image_accepted"; sizeKb: number; width: number; height: number; hash: string }
  | { type: "stage_started"; stage: string; variantId?: string; wallMs: number }
  | { type: "stage_completed"; stage: string; durationMs: number; degraded: boolean; variantId?: string; wallMs: number }
  | { type: "pipeline_completed"; totalDurationMs: number; wallMs: number }
  | { type: "pipeline_failed"; message: string; wallMs: number }
  | { type: "error"; message: string };

type StageTiming = {
  stage: string;
  startWallMs: number;
  endWallMs?: number;
  durationMs?: number;
  degraded?: boolean;
};

type EtaStats = {
  sampleSize: number;
  total: { p50: number | null; p75: number | null; p90: number | null; avg: number | null };
  stageStats: Record<string, { p50: number | null; p75: number | null; p90: number | null; avgMs: number; degradationPct: number; sampleCount: number }>;
  generatedAt: string;
};

const STAGE_ORDER = [
  "rekognition", "face_shape", "color_analysis", "skin_vision",
  "features", "skin_routine", "glasses", "hairstyle", "summary",
];

function ms(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

function fmtMs(n: number): string {
  return `${(n / 1000).toFixed(2)}s`;
}

function eventColor(type: string): string {
  if (type === "stage_completed") return "#63A282";
  if (type === "stage_started") return "#7B6E9E";
  if (type.includes("fail") || type === "error") return "#F87171";
  if (type === "pipeline_completed") return "#111827";
  return "#C9956B";
}

function EventLabel({ event }: { event: DebugEvent }) {
  const color = eventColor(event.type);
  let detail = "";
  if (event.type === "stage_started") detail = `${event.stage}${event.variantId ? ` [${event.variantId}]` : ""}`;
  else if (event.type === "stage_completed")
    detail = `${event.stage}${event.variantId ? ` [${event.variantId}]` : ""} — ${ms(event.durationMs)}${event.degraded ? " ⚠ degraded" : ""}`;
  else if (event.type === "pipeline_completed") detail = `total ${fmtMs(event.totalDurationMs)}`;
  else if (event.type === "pipeline_failed") detail = event.message;
  else if (event.type === "image_accepted")
    detail = `${event.width}×${event.height}px, ${event.sizeKb}kB, sha256:${event.hash.slice(0, 8)}…`;
  else if (event.type === "auth_ok") detail = event.email;
  else if (event.type === "error") detail = event.message;

  return (
    <span>
      <span className="font-mono text-xs px-1.5 py-0.5 rounded mr-2" style={{ background: `${color}20`, color }}>
        {event.type}
      </span>
      <span className="text-xs text-ink-stone">{detail}</span>
      {"wallMs" in event && (
        <span className="ml-2 text-xs text-ink-stone opacity-50">+{fmtMs((event as { wallMs: number }).wallMs)}</span>
      )}
    </span>
  );
}

function TimingBar({ timings, totalMs }: { timings: StageTiming[]; totalMs: number }) {
  const max = Math.max(totalMs, 1);
  return (
    <div className="space-y-1.5">
      {timings.map((t) => {
        const w = ((t.durationMs ?? 0) / max) * 100;
        return (
          <div key={t.stage} className="flex items-center gap-3">
            <span className="font-mono text-xs text-ink-stone w-28 shrink-0 text-right">{t.stage}</span>
            <div className="flex-1 bg-petal h-3 rounded overflow-hidden relative">
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: t.endWallMs ? `${Math.min(w, 100)}%` : "100%",
                  background: t.degraded ? "rgba(248,113,113,0.7)" : t.endWallMs ? "#111827" : "rgba(17,24,39,0.4)",
                  animation: t.endWallMs ? undefined : "pulse 1s ease-in-out infinite",
                }}
              />
            </div>
            <span className="text-xs text-ink-stone w-14 shrink-0 font-mono text-right">
              {t.endWallMs ? ms(t.durationMs) : "running…"}
            </span>
            {t.degraded && <span className="text-xs font-medium" style={{ color: "#F87171" }}>⚠ degraded</span>}
          </div>
        );
      })}
    </div>
  );
}

function EtaStatsPanel({ stats }: { stats: EtaStats }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(17,24,39,0.14)" }}>
      <div className="flex items-baseline gap-2">
        <h2 className="font-sans text-ink text-lg">Historical ETA stats</h2>
        <span className="text-xs text-ink-stone">({stats.sampleSize} runs, last 24h)</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Avg", v: stats.total.avg },
          { label: "p50", v: stats.total.p50 },
          { label: "p75", v: stats.total.p75 },
          { label: "p90", v: stats.total.p90 },
        ].map(({ label, v }) => (
          <div key={label} className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(17,24,39,0.1)" }}>
            <p className="text-xs text-ink-stone">{label}</p>
            <p className="font-sans text-ink mt-1">{ms(v)}</p>
          </div>
        ))}
      </div>
      {Object.keys(stats.stageStats).length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(17,24,39,0.12)" }}>
                {["Stage", "Avg", "p50", "p75", "p90", "Degraded%", "n"].map((h) => (
                  <th key={h} className="pb-2 pt-1 pr-3 text-left font-medium text-ink-stone uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAGE_ORDER.filter((s) => stats.stageStats[s]).map((stage) => {
                const s = stats.stageStats[stage];
                return (
                  <tr key={stage} className="border-b" style={{ borderColor: "rgba(17,24,39,0.07)" }}>
                    <td className="py-1.5 pr-3 font-mono text-ink">{stage}</td>
                    <td className="py-1.5 pr-3 text-ink-stone">{ms(s.avgMs)}</td>
                    <td className="py-1.5 pr-3 text-ink-stone">{ms(s.p50)}</td>
                    <td className="py-1.5 pr-3 text-ink-stone">{ms(s.p75)}</td>
                    <td className="py-1.5 pr-3 text-ink-stone">{ms(s.p90)}</td>
                    <td className="py-1.5 pr-3">
                      <span className="rounded-full px-1.5 py-0.5" style={{ background: s.degradationPct > 20 ? "rgba(248,113,113,0.15)" : "rgba(17,24,39,0.12)", color: s.degradationPct > 20 ? "#F87171" : "#C9956B" }}>
                        {s.degradationPct}%
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-ink-stone">{s.sampleCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main client component ────────────────────────────────────────────────────

export function PipelineDebugClient({ userEmail }: { userEmail: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [timings, setTimings] = useState<StageTiming[]>([]);
  const [totalMs, setTotalMs] = useState(0);
  const [etaStats, setEtaStats] = useState<EtaStats | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  function appendEvent(ev: DebugEvent) {
    setEvents((prev) => [...prev, ev]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  async function loadEtaStats() {
    setEtaLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline-debug");
      if (res.ok) setEtaStats(await res.json() as EtaStats);
    } finally {
      setEtaLoading(false);
    }
  }

  async function runDebug() {
    if (!file || running) return;
    setRunning(true);
    setEvents([]);
    setTimings([]);
    setTotalMs(0);

    const form = new FormData();
    form.append("image", file);

    let res: Response;
    try {
      res = await fetch("/api/admin/pipeline-debug", { method: "POST", body: form });
    } catch (err) {
      appendEvent({ type: "error", message: (err as Error).message });
      setRunning(false);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { setRunning(false); return; }

    const decoder = new TextDecoder();
    let buf = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed) continue;
          let ev: DebugEvent;
          try { ev = JSON.parse(trimmed) as DebugEvent; } catch { continue; }
          appendEvent(ev);

          if (ev.type === "stage_started") {
            setTimings((prev) => [
              ...prev.filter((t) => t.stage !== ev.stage),
              { stage: ev.stage, startWallMs: ev.wallMs },
            ]);
          } else if (ev.type === "stage_completed") {
            setTimings((prev) =>
              prev.map((t) =>
                t.stage === ev.stage
                  ? { ...t, endWallMs: ev.wallMs, durationMs: ev.durationMs, degraded: ev.degraded }
                  : t,
              ),
            );
          } else if (ev.type === "pipeline_completed") {
            setTotalMs(ev.totalDurationMs);
          }
        }
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="container max-w-5xl py-12 min-h-screen space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-medium mb-2" style={{ color: "#111827" }}>Admin · Debug</p>
        <h1 className="font-sans text-3xl text-ink">Pipeline Debug Console</h1>
        <p className="text-xs text-ink-stone mt-1">Signed in as <span className="font-mono">{userEmail}</span></p>
      </div>

      {/* ETA stats panel */}
      <div>
        <button
          onClick={loadEtaStats}
          disabled={etaLoading}
          className="text-sm px-4 py-2 rounded-xl font-medium transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.1), rgba(17,24,39,0.1))", color: "#111827", border: "1px solid rgba(17,24,39,0.25)" }}
        >
          {etaLoading ? "Loading…" : etaStats ? "Refresh ETA stats" : "Load historical ETA stats"}
        </button>
        {etaStats && <div className="mt-4"><EtaStatsPanel stats={etaStats} /></div>}
      </div>

      {/* Upload & Run */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(17,24,39,0.14)" }}
      >
        <h2 className="font-sans text-ink text-lg">Run live analysis</h2>
        <p className="text-xs text-ink-stone">Upload any selfie — pipeline runs in full, no report is saved.</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={running}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-stone file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium file:cursor-pointer disabled:opacity-50"
            style={{ "--file-bg": "rgba(17,24,39,0.1)", "--file-color": "#111827" } as React.CSSProperties}
          />
          <button
            onClick={runDebug}
            disabled={!file || running}
            className="shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #111827, #C9956B)", color: "white" }}
          >
            {running ? "Running…" : "▶ Run pipeline"}
          </button>
          {events.length > 0 && !running && (
            <button
              onClick={() => { setEvents([]); setTimings([]); setTotalMs(0); }}
              className="text-xs text-ink-stone underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stage timing bars */}
      {timings.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(17,24,39,0.14)" }}
        >
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-sans text-ink text-lg">Stage timings</h2>
            {totalMs > 0 && <span className="text-xs text-ink-stone">total {fmtMs(totalMs)}</span>}
            {running && <span className="text-xs font-medium animate-pulse" style={{ color: "#111827" }}>● live</span>}
          </div>
          <TimingBar timings={timings} totalMs={totalMs || timings.reduce((s, t) => s + (t.durationMs ?? 0), 0)} />
        </div>
      )}

      {/* Raw event log */}
      {events.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(17,24,39,0.14)" }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(17,24,39,0.14)" }}>
            <h2 className="font-sans text-ink text-base">Event log</h2>
            {running && <span className="text-xs font-medium animate-pulse" style={{ color: "#111827" }}>● streaming</span>}
          </div>
          <div
            ref={logRef}
            className="overflow-y-auto p-4 space-y-1.5 font-mono text-xs"
            style={{ maxHeight: "420px", background: "rgba(255,250,253,0.6)" }}
          >
            {events.map((ev, i) => (
              <div key={i} className="flex items-baseline gap-1">
                <span className="text-ink-stone opacity-40 w-5 shrink-0 text-right">{i + 1}</span>
                <span className="ml-2"><EventLabel event={ev} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back link */}
      <div>
        <a href="/admin" className="text-xs text-ink-stone underline">← Back to admin dashboard</a>
      </div>
    </main>
  );
}
