"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { ReportVisualAsset } from "@/types/report";

interface Props {
  asset?: ReportVisualAsset;
  title: string;
  loadingMessage: string;
  aspectRatio?: string;
  /** auto: missing shows spinner (background job). manual: use AnalysisSectionCard instead. */
  generationMode?: "auto" | "manual";
}

const frameStyle = { background: "var(--infographic-frame)" } as const;

export function AnalysisInfographicImage({
  asset,
  title,
  loadingMessage,
  aspectRatio = "4/5",
  generationMode = "auto",
}: Props) {
  const status = asset?.status ?? (generationMode === "auto" ? "pending" : "missing");
  const imageUrl = asset?.signedUrl;

  if (status === "ready" && imageUrl) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)]" style={frameStyle}>
        <div className="relative w-full" style={{ aspectRatio }}>
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="report-surface-panel rounded-3xl px-6 py-12 text-center" style={frameStyle}>
        <p className="text-base font-medium text-ink">
          We couldn&apos;t generate your {title.toLowerCase()}.
        </p>
        <p className="mt-2 text-sm text-ink-stone">
          {asset?.error ?? "Please refresh the page in a moment."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="report-surface-panel flex flex-col items-center justify-center gap-4 rounded-3xl border border-[var(--color-border)] px-6"
      style={{ ...frameStyle, aspectRatio }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
      <p className="text-center text-base font-medium text-ink">
        {loadingMessage}
      </p>
      <p className="max-w-sm text-center text-sm text-ink-stone">
        This usually takes under a minute. The page will update automatically.
      </p>
    </div>
  );
}
