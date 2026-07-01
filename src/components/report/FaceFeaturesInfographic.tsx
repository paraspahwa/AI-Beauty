"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";
import { InfographicReadyBar } from "./InfographicReadyBar";

interface Props {
  asset?: ReportVisualAsset;
  isPaid: boolean;
  createdAt?: string;
  downloadSectionKey: "faceFeatures" | "faceFeaturesPreview";
  highlighted?: boolean;
}

export function FaceFeaturesInfographic({
  asset,
  isPaid,
  createdAt,
  downloadSectionKey,
  highlighted = false,
}: Props) {
  const title = isPaid ? "Face Features Analysis" : "Face Shape Preview";
  const downloadLabel = isPaid ? "Face Features" : "Face Shape Preview";

  return (
    <section
      id="report-section-face"
      className={`report-surface-panel scroll-mt-24 overflow-hidden rounded-3xl border transition-shadow ${
        highlighted
          ? "border-terracotta/50 ring-2 ring-terracotta/25 shadow-[0_0_0_4px_rgba(180,83,9,0.06)]"
          : "border-terracotta/10"
      }`}
    >
      <div className="border-b border-terracotta/10 bg-[var(--report-icon-bg)]/40 px-6 py-5 sm:px-8">
        <p className="foil-label mb-2 border-none p-0">Chapter I</p>
        <h2 className="font-display text-2xl text-ink">{title}</h2>
      </div>
      <div className="p-4 sm:p-6">
        <AnalysisInfographicImage
          asset={asset}
          title="Face features analysis"
          generationMode="auto"
          loadingMessage={
            isPaid
              ? "Generating your full face features analysis…"
              : "Generating your face shape analysis…"
          }
        />
        {asset?.status === "ready" && asset.signedUrl && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <InfographicReadyBar
              signedUrl={asset.signedUrl}
              sectionKey={downloadSectionKey}
              mime={asset.mime}
              createdAt={createdAt}
              label={downloadLabel}
            />
          </div>
        )}
      </div>
    </section>
  );
}
