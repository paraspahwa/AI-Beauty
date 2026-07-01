"use client";

import { AnalysisInfographicImage } from "./AnalysisInfographicImage";
import { InfographicReadyBar } from "./InfographicReadyBar";
import type { ReportVisualAsset } from "@/types/report";

interface Props {
  asset?: ReportVisualAsset;
  createdAt?: string;
}

export function StyleGuideInfographic({ asset, createdAt }: Props) {
  return (
    <section className="report-surface-panel overflow-hidden rounded-3xl border border-terracotta/10">
      <div className="border-b border-terracotta/10 bg-[var(--report-icon-bg)]/40 px-6 py-5 sm:px-8">
        <p className="foil-label mb-2 border-none p-0">Style Guide</p>
        <h2 className="font-display text-2xl text-ink">Your Personal Style Board</h2>
      </div>
      <div className="p-4 sm:p-6">
        <AnalysisInfographicImage
          asset={asset}
          title="Style Guide"
          loadingMessage="Generating your personal style guide…"
          aspectRatio="3/4"
          generationMode="auto"
        />
        {asset?.status === "ready" && asset.signedUrl && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <InfographicReadyBar
              signedUrl={asset.signedUrl}
              sectionKey="styleGuide"
              mime={asset.mime}
              createdAt={createdAt}
              label="Style Board"
            />
          </div>
        )}
      </div>
    </section>
  );
}
