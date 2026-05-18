"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";

export type BeforeAfterItem = {
  id: string;
  title: string;
  beforeSrc: string;
  afterSrc: string;
  beforeFallbackSrc: string;
  afterFallbackSrc: string;
  beforeAlt: string;
  afterAlt: string;
  tag?: string;
};

export type ShowcaseTuning = {
  marqueeLeftSeconds: number;
  marqueeRightSeconds: number;
  cardWidthClass: string;
  cardHeightClass: string;
  rowGapClass: string;
};

interface SampleShowcaseProps {
  items: BeforeAfterItem[];
  tuning?: Partial<ShowcaseTuning>;
}

const DEFAULT_TUNING: ShowcaseTuning = {
  marqueeLeftSeconds: 32,
  marqueeRightSeconds: 36,
  cardWidthClass: "w-56 sm:w-64",
  cardHeightClass: "h-64 sm:h-72",
  rowGapClass: "gap-4",
};

function BeforeAfterCard({ item, tuning }: { item: BeforeAfterItem; tuning: ShowcaseTuning }) {
  const [beforeSrc, setBeforeSrc] = useState(item.beforeSrc);
  const [afterSrc, setAfterSrc] = useState(item.afterSrc);
  const [sliderPct, setSliderPct] = useState(100);
  const animating = useRef(true);
  const beforeBadgeLabel = "Before";
  const afterBadgeLabel = "After";

  useEffect(() => {
    setBeforeSrc(item.beforeSrc);
    setAfterSrc(item.afterSrc);
  }, [item.afterSrc, item.beforeSrc]);

  // Auto-demo: animate slider from 100 → 50 on mount
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const delay = setTimeout(() => {
      const animate = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 1100, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setSliderPct(100 - eased * 50);
        if (progress < 1) frame = requestAnimationFrame(animate);
        else animating.current = false;
      };
      frame = requestAnimationFrame(animate);
    }, 500);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
    };
  }, []);

  const handleMove = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    animating.current = false;
    setSliderPct(pct);
  };

  return (
    <motion.article
      className={`${tuning.cardWidthClass} shrink-0 overflow-hidden rounded-3xl border border-terracotta/20 bg-white/85 shadow-card cursor-ew-resize select-none`}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
      onMouseMove={(e: ReactMouseEvent<HTMLElement>) => handleMove(e.clientX, e.currentTarget as HTMLElement)}
      onTouchMove={(e: ReactTouchEvent<HTMLElement>) => handleMove(e.touches[0].clientX, e.currentTarget as HTMLElement)}
    >
      <div className={`relative ${tuning.cardHeightClass}`}>
        {/* After image — always visible underneath */}
        <div className="absolute inset-0">
          <Image
            src={afterSrc}
            alt={item.afterAlt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 224px, 256px"
            onError={() => {
              if (afterSrc !== item.afterFallbackSrc) setAfterSrc(item.afterFallbackSrc);
            }}
          />
        </div>
        {/* Before image — clipped to show left portion */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
        >
          <Image
            src={beforeSrc}
            alt={item.beforeAlt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 224px, 256px"
            onError={() => {
              if (beforeSrc !== item.beforeFallbackSrc) setBeforeSrc(item.beforeFallbackSrc);
            }}
          />
        </div>
        {/* Divider line + handle */}
        <div
          className="pointer-events-none absolute inset-y-0 flex flex-col items-center"
          style={{ left: `${sliderPct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-0.5 bg-white/80 shadow-sm" />
          <div className="absolute top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-terracotta/60 bg-white text-[11px] font-bold text-terracotta/80 shadow-md">
            ⇄
          </div>
        </div>
        {/* Labels */}
        <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          {beforeBadgeLabel}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-terracotta px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          {afterBadgeLabel}
        </span>
      </div>
      <div className="space-y-1 px-4 py-3">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        {item.tag ? <p className="text-xs text-ink-stone">{item.tag}</p> : null}
      </div>
    </motion.article>
  );
}

function ShowcaseRow({
  items,
  direction = "left",
  tuning,
}: {
  items: BeforeAfterItem[];
  direction?: "left" | "right";
  tuning: ShowcaseTuning;
}) {
  const duplicated = [...items, ...items];
  const animationClass = direction === "left" ? "animate-marquee-left" : "animate-marquee-right";
  const duration = direction === "left" ? tuning.marqueeLeftSeconds : tuning.marqueeRightSeconds;

  return (
    <div className="marquee-mask relative overflow-hidden">
      <div
        className={`group flex w-max ${tuning.rowGapClass} ${animationClass} hover:[animation-play-state:paused]`}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {duplicated.map((item, index) => (
          <div key={`${item.id}-${index}`} aria-hidden={index >= items.length}>
            <BeforeAfterCard item={item} tuning={tuning} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SampleShowcase({ items, tuning }: SampleShowcaseProps) {
  const mergedTuning: ShowcaseTuning = { ...DEFAULT_TUNING, ...(tuning ?? {}) };
  const rowA = [items[0], items[1], items[2], items[3]].filter(Boolean) as BeforeAfterItem[];
  const rowB = [items[2], items[3], items[0], items[1]].filter(Boolean) as BeforeAfterItem[];

  return (
    <motion.section
      className="container max-w-6xl py-12 sm:py-16"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center">
        <span className="section-label">Real Transformations</span>
        <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Before and after previews, at a glance</h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
          Compare natural selfies with AI-guided outcomes so you can decide what to try next with confidence.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <ShowcaseRow items={rowA} direction="left" tuning={mergedTuning} />
        <div className="hidden sm:block">
          <ShowcaseRow items={rowB} direction="right" tuning={mergedTuning} />
        </div>
      </div>
    </motion.section>
  );
}
