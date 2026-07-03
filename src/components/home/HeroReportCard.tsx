"use client";

import Image from "next/image";
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toReportSampleItems } from "@/lib/home-content";
import type { ReportSampleItem } from "@/lib/home-content";
import { carouselSlideUp } from "@/lib/animations";
import styles from "@/app/home.module.css";

const AUTOPLAY_MS = 4000;

export function HeroReportCard() {
  const samples = React.useMemo(() => toReportSampleItems().slice(0, 3), []);
  const [sources, setSources] = React.useState(() => samples.map((s) => s.imageSrc));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reducedMotion = useReducedMotion();
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const active = samples[activeIndex] ?? samples[0];

  const clearAutoplay = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoplay = React.useCallback(() => {
    clearAutoplay();
    if (reducedMotion || paused || samples.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % samples.length);
    }, AUTOPLAY_MS);
  }, [clearAutoplay, reducedMotion, paused, samples.length]);

  React.useEffect(() => {
    startAutoplay();
    return clearAutoplay;
  }, [startAutoplay, clearAutoplay]);

  function goTo(index: number) {
    setActiveIndex(index);
    if (!reducedMotion && !paused) startAutoplay();
  }

  function handleImageError(index: number, sample: ReportSampleItem) {
    setSources((prev) => {
      const next = [...prev];
      if (next[index] !== sample.fallbackSrc) {
        next[index] = sample.fallbackSrc;
      }
      return next;
    });
  }

  const motionProps = reducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 1, y: 0, scale: 1 } }
    : carouselSlideUp;

  return (
    <div
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm flex-col items-center justify-center sm:max-w-md lg:max-w-none lg:min-h-[420px]"
      role="region"
      aria-label="Report sample previews"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="absolute left-0 top-0 z-10 rounded-full border border-terracotta/30 bg-[var(--color-surface)]/90 px-3 py-1.5 text-xs font-semibold text-terracotta backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Sample dossier
        </span>
      </div>

      <div className={`${styles.heroCarouselStage} mt-8 w-full`}>
        <AnimatePresence mode="wait">
          {active ? (
            <motion.article
              key={active.id}
              className={styles.heroCarouselCard}
              {...motionProps}
            >
              <div className="relative aspect-[3/4] w-full bg-[var(--infographic-frame)]">
                <Image
                  src={sources[activeIndex] ?? active.imageSrc}
                  alt={active.imageAlt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 72vw, 260px"
                  priority={activeIndex === 0}
                  onError={() => handleImageError(activeIndex, active)}
                />
              </div>
              <p
                className="truncate px-3 pb-3 pt-2 text-center text-xs font-semibold text-ink"
                aria-live="polite"
              >
                {active.label}
              </p>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className="mt-5 flex items-center gap-2"
        role="tablist"
        aria-label="Choose sample preview"
      >
        {samples.map((sample, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={sample.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "true" : undefined}
              aria-label={`Show ${sample.label}`}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive
                  ? "w-7 bg-terracotta"
                  : "w-2 bg-terracotta/25 hover:bg-terracotta/45"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
