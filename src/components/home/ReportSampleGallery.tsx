"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toReportSampleItems, type ReportSampleItem } from "@/lib/home-content";
import { cn } from "@/lib/utils";

interface Props {
  /** Full section with heading + CTA, or compact hero card. */
  variant?: "full" | "compact";
  /** Override samples (defaults to home content). */
  items?: ReportSampleItem[];
  className?: string;
}

function SamplePreview({
  item,
  compact,
}: {
  item: ReportSampleItem;
  compact?: boolean;
}) {
  const [src, setSrc] = React.useState(item.imageSrc);

  React.useEffect(() => {
    setSrc(item.imageSrc);
  }, [item.imageSrc]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl",
        compact ? "mt-4" : "mt-6",
      )}
      style={{ background: "var(--infographic-frame, #F7F2EC)" }}
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: compact ? "4/5" : "3/4" }}
      >
        <Image
          src={src}
          alt={item.imageAlt}
          fill
          className="object-contain p-2 sm:p-4"
          sizes={compact ? "(max-width: 768px) 100vw, 480px" : "(max-width: 768px) 100vw, 720px"}
          onError={() => {
            if (src !== item.fallbackSrc) setSrc(item.fallbackSrc);
          }}
        />
      </div>
    </div>
  );
}

export function ReportSampleGallery({
  variant = "full",
  items: itemsProp,
  className,
}: Props) {
  const items = itemsProp ?? toReportSampleItems();
  const [activeId, setActiveId] = React.useState(items[0]?.id ?? "");
  const active = items.find((item) => item.id === activeId) ?? items[0];

  if (!active || items.length === 0) return null;

  const isCompact = variant === "compact";

  return (
    <section
      id={isCompact ? undefined : "samples"}
      className={cn(
        isCompact ? undefined : "container max-w-6xl scroll-mt-20 py-16",
        className,
      )}
    >
      <div className={isCompact ? undefined : "text-center"}>
        {!isCompact && (
          <span className="section-label">Sample report</span>
        )}
        <h2
          className={cn(
            "text-ink font-normal",
            isCompact ? "mt-0 text-2xl" : "mt-3 text-3xl sm:text-4xl",
          )}
          style={isCompact ? undefined : { fontFamily: "Georgia, serif" }}
        >
          {isCompact ? "See what your report looks like" : "See what your report looks like"}
        </h2>
        <p
          className={cn(
            "text-ink-stone",
            isCompact ? "mt-2 text-sm" : "mx-auto mt-3 max-w-2xl text-base",
          )}
        >
          {isCompact
            ? "Luxury infographics from one selfie — tap a section to preview."
            : "Six analysis infographics plus a downloadable PDF — each section delivered as a polished graphic you can save and share."}
        </p>
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-2",
          isCompact ? "mt-4" : "mx-auto mt-8 max-w-3xl justify-center",
        )}
        role="tablist"
        aria-label="Report sample sections"
      >
        {items.map((item) => {
          const selected = item.id === active.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                selected
                  ? "border-terracotta bg-terracotta/15 text-terracotta"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-ink-stone hover:border-terracotta/40",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={isCompact ? undefined : "mx-auto mt-8 max-w-2xl"}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-medium text-ink">{active.label}</p>
            <p className="mt-1 text-sm text-ink-stone">{active.description}</p>
          </div>
          {active.tag ? (
            <span className="shrink-0 rounded-full bg-terracotta/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
              {active.tag}
            </span>
          ) : null}
        </div>

        <SamplePreview item={active} compact={isCompact} />
      </div>

      <div className={cn("text-center", isCompact ? "mt-5" : "mt-8")}>
        <Button asChild size={isCompact ? "md" : "lg"} variant="accent" className="group">
          <Link href="/upload">
            Start free analysis
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
