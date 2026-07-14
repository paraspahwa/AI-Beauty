"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { ReportVisualAsset } from "@/types/report";
import type { ManualPaidInfographicSection } from "@/lib/ai/run-analysis-infographics";
import { sectionDomId } from "@/lib/report/journey-hints";
import { fadeUp } from "@/lib/animations";
import { InfographicReadyBar } from "./InfographicReadyBar";

interface Props {
  reportId: string;
  section: ManualPaidInfographicSection;
  chapterLabel: string;
  title: string;
  description: string;
  asset?: ReportVisualAsset;
  createdAt?: string;
  highlighted?: boolean;
  onRefresh: () => void;
}

const frameStyle = { background: "var(--infographic-frame)" } as const;

export function AnalysisSectionCard({
  reportId,
  section,
  chapterLabel,
  title,
  description,
  asset,
  createdAt,
  highlighted = false,
  onRefresh,
}: Props) {
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const status = asset?.status ?? "missing";

  async function startGeneration() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/generate-infographic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not start generation");
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const isGenerating = starting || status === "pending";

  return (
    <motion.section
      id={sectionDomId(section)}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className={`report-surface-panel scroll-mt-24 overflow-hidden rounded-3xl border transition-shadow ${
        highlighted
          ? "border-terracotta/50 ring-2 ring-terracotta/25 shadow-[0_0_0_4px_rgba(180,83,9,0.06)]"
          : "border-terracotta/10"
      }`}
    >
      <div className="border-b border-terracotta/10 bg-[var(--report-icon-bg)]/40 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="foil-label mb-2 border-none p-0">{chapterLabel}</p>
            <h2 className="font-display text-2xl text-ink sm:text-[1.65rem]">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-stone">{description}</p>
          </div>
          <StatusChip status={isGenerating ? "pending" : status} />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {status === "ready" && asset?.signedUrl ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]" style={frameStyle}>
            <div className="relative w-full" style={{ aspectRatio: "4/5" }}>
              <Image
                src={asset.signedUrl}
                alt={title}
                fill
                unoptimized
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 900px"
              />
            </div>
            <InfographicReadyBar
              signedUrl={asset.signedUrl}
              sectionKey={section}
              mime={asset.mime}
              createdAt={createdAt}
              label={title}
              reportId={reportId}
              shareText={`My ${title.toLowerCase()} analysis from Renovaara.`}
            />
          </div>
        ) : status === "failed" ? (
          <ActionPanel
            icon={<Sparkles className="h-7 w-7 text-terracotta" />}
            title="Generation didn't complete"
            body={asset?.error ?? "Tap below to try again."}
            buttonLabel="Retry generation"
            onAction={startGeneration}
            loading={starting}
            error={error}
          />
        ) : isGenerating ? (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-terracotta/25 px-6 py-16"
            style={frameStyle}
          >
            <Loader2 className="h-9 w-9 animate-spin text-terracotta" />
            <p className="text-center text-base font-medium text-ink">Creating your {title.toLowerCase()}…</p>
            <p className="max-w-sm text-center text-sm text-ink-stone">
              Usually under a minute. We&apos;ll save it to your Vault when ready.
            </p>
          </div>
        ) : (
          <ActionPanel
            icon={<Sparkles className="h-7 w-7 text-terracotta" />}
            title="Ready to illustrate"
            body="Generate a personalised infographic from your analysis. One tap — one board, saved to your Vault."
            buttonLabel={`Generate ${title}`}
            onAction={startGeneration}
            loading={starting}
            error={error}
          />
        )}
      </div>
    </motion.section>
  );
}

function StatusChip({ status }: { status: ReportVisualAsset["status"] | "pending" }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Check className="h-3.5 w-3.5" />
        In Vault
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 px-3 py-1 text-xs font-semibold text-terracotta">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Creating…
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex rounded-full border border-red-300/50 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
        Needs retry
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-ink-stone/20 bg-[var(--report-photo-bg)] px-3 py-1 text-xs font-semibold text-ink-stone">
      Not started
    </span>
  );
}

function ActionPanel({
  icon,
  title,
  body,
  buttonLabel,
  onAction,
  loading,
  error,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  buttonLabel: string;
  onAction: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-terracotta/20 px-6 py-14 text-center sm:py-16"
      style={frameStyle}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-terracotta/20 bg-[var(--report-icon-bg)]">
        {icon}
      </div>
      <div className="max-w-md space-y-2">
        <p className="font-display text-xl text-ink">{title}</p>
        <p className="text-sm text-ink-stone">{body}</p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onAction()}
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-espresso px-7 py-3.5 text-sm font-semibold text-[var(--btn-fg)] shadow-md transition hover:bg-espresso/90 disabled:opacity-60"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-terracotta/0 via-terracotta/15 to-terracotta/0 opacity-0 transition group-hover:opacity-100" />
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-terracotta" />
        )}
        {loading ? "Starting…" : buttonLabel}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
