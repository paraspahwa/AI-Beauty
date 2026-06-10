"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles, Wand2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STUDIO_EXPERIENCES } from "@/lib/product-copy";
import styles from "@/app/studio/studio.module.css";

type Highlight = "quick" | "advanced" | "report";

interface Props {
  variant?: "full" | "compact";
  highlight?: Highlight;
  /** When set, Report Try-On CTA links to this report's try-shop tab. */
  latestReportId?: string | null;
  /** When set, Advanced Studio CTA links to this canvas with ?advanced=1. */
  advancedCanvasId?: string | null;
  className?: string;
}

function highlightClass(highlight: Highlight | undefined, key: Highlight): string {
  if (highlight !== key) return styles.softCard;
  return `${styles.surfaceCard} ring-2 ring-[rgba(17,24,39,0.18)]`;
}

export function StudioExperienceCompare({
  variant = "full",
  highlight,
  latestReportId = null,
  advancedCanvasId = null,
  className = "",
}: Props) {
  const { quickTry, advancedStudio, reportTryOn, compareTitle, compareSubtitle } = STUDIO_EXPERIENCES;

  const reportHref = latestReportId
    ? `/report/${latestReportId}?tab=try-shop`
    : reportTryOn.ctaUploadHref;

  const reportCta = latestReportId ? reportTryOn.cta : reportTryOn.ctaUpload;

  const advancedHref = advancedCanvasId
    ? `/studio/${advancedCanvasId}?advanced=1`
    : null;

  const showAdvanced = variant === "full" || highlight === "advanced";

  return (
    <section className={className} aria-labelledby="studio-compare-heading">
      <div className="mb-4 space-y-1">
        <h2 id="studio-compare-heading" className="font-sans text-xl text-ink sm:text-2xl">
          {compareTitle}
        </h2>
        {variant === "full" && (
          <p className="text-sm text-ink-stone">{compareSubtitle}</p>
        )}
      </div>

      <div
        className={`grid gap-4 ${
          showAdvanced
            ? "md:grid-cols-3"
            : "sm:grid-cols-2"
        }`}
      >
        {/* Quick Try */}
        <div className={`rounded-2xl border p-4 sm:p-5 ${highlightClass(highlight, "quick")}`}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#111827]" />
            <h3 className="text-sm font-semibold text-ink">{quickTry.name}</h3>
          </div>
          <p className="text-xs leading-relaxed text-ink-stone">{quickTry.tagline}</p>
          <ul className="mt-3 space-y-1.5">
            {quickTry.bullets.slice(0, variant === "compact" ? 3 : 4).map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-ink-stone">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#111827]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="accent" size="sm" className="mt-4 w-full sm:w-auto">
            <Link href={quickTry.ctaHref}>
              {quickTry.cta}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Advanced Studio — full variant or when highlighted */}
        {showAdvanced && (
          <div className={`rounded-2xl border p-4 sm:p-5 ${highlightClass(highlight, "advanced")}`}>
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[#111827]" />
              <h3 className="text-sm font-semibold text-ink">{advancedStudio.name}</h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-stone">{advancedStudio.tagline}</p>
            <ul className="mt-3 space-y-1.5">
              {advancedStudio.bullets.slice(0, variant === "compact" ? 3 : 4).map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-ink-stone">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#111827]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {advancedHref ? (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full sm:w-auto">
                <Link href={advancedHref}>
                  {advancedStudio.cta}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <p className="mt-4 text-xs text-ink-stone italic">
                Available after you start a Quick Try session
              </p>
            )}
          </div>
        )}

        {/* Report Try-On */}
        <div className={`rounded-2xl border p-4 sm:p-5 ${highlightClass(highlight, "report")}`}>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#111827]" />
            <h3 className="text-sm font-semibold text-ink">{reportTryOn.name}</h3>
          </div>
          <p className="text-xs leading-relaxed text-ink-stone">{reportTryOn.tagline}</p>
          <ul className="mt-3 space-y-1.5">
            {reportTryOn.bullets.slice(0, variant === "compact" ? 3 : 4).map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-ink-stone">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#111827]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full sm:w-auto">
            <Link href={reportHref}>
              {reportCta}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Slim promo card for Advanced Studio on canvas session pages. */
export function AdvancedStudioPromo({ canvasId }: { canvasId: string }) {
  const { advancedStudio } = STUDIO_EXPERIENCES;

  return (
    <div className={`mt-6 rounded-2xl border p-5 sm:p-6 ${styles.softCard}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">{advancedStudio.name}</p>
          <p className="text-xs text-ink-stone">{advancedStudio.tagline}</p>
          <ul className="space-y-1">
            {advancedStudio.bullets.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-ink-stone">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#111827]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/studio/${canvasId}?advanced=1`}>
            {advancedStudio.cta}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
