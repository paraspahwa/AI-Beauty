"use client";

import Image from "next/image";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toReportSampleItems } from "@/lib/home-content";
import type { ReportSampleItem } from "@/lib/home-content";
import {
  carouselDeckExitEase,
  carouselDeckSpring,
  getDeckLayout,
} from "@/lib/animations";
import styles from "@/app/home.module.css";

const AUTOPLAY_MS = 4000;
const CHAPTER_NUMERALS = ["I", "II", "III"] as const;

export function HeroReportCard() {
  const samples = React.useMemo(() => toReportSampleItems().slice(0, 3), []);
  const [sources, setSources] = React.useState(() => samples.map((s) => s.imageSrc));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [exitingIndex, setExitingIndex] = React.useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActiveRef = React.useRef(0);

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

  React.useEffect(() => {
    if (reducedMotion || prevActiveRef.current === activeIndex) {
      prevActiveRef.current = activeIndex;
      return;
    }
    const prev = prevActiveRef.current;
    prevActiveRef.current = activeIndex;
    setExitingIndex(prev);
    const t = setTimeout(() => setExitingIndex(null), 500);
    return () => clearTimeout(t);
  }, [activeIndex, reducedMotion]);

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

  function deckTransition(index: number, role: ReturnType<typeof getDeckLayout>["role"]) {
    if (reducedMotion) return { duration: 0 };
    if (exitingIndex === index && role !== "active") {
      return carouselDeckExitEase;
    }
    return carouselDeckSpring;
  }

  function deckAnimate(index: number) {
    const layout = getDeckLayout(index, activeIndex, samples.length, !!reducedMotion);
    const isLifting = !reducedMotion && exitingIndex === index && layout.role !== "active";
    return {
      x: layout.x,
      y: isLifting ? -28 : layout.y,
      scale: isLifting ? 0.95 : layout.scale,
      rotate: isLifting ? -2 : layout.rotate,
      opacity: isLifting ? 0 : layout.opacity,
      zIndex: layout.zIndex,
    };
  }

  return (
    <div
      className="relative mx-auto flex w-full max-w-sm flex-col items-center sm:max-w-md lg:max-w-none lg:min-h-[460px]"
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
      <div className="absolute left-0 top-0 z-40 rounded-full border border-terracotta/30 bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-terracotta shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Sample dossier
        </span>
      </div>

      <div className={`${styles.heroCarouselStage} w-full`}>
        <div
          className={styles.heroCarouselChapterRow}
          role="tablist"
          aria-label="Choose sample chapter"
        >
          {samples.map((sample, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={sample.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Chapter ${CHAPTER_NUMERALS[index]}: ${sample.label}`}
                onClick={() => goTo(index)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] transition-colors ${
                  isActive
                    ? "bg-terracotta/15 text-terracotta"
                    : "text-ink-mist hover:text-ink-stone"
                }`}
              >
                {CHAPTER_NUMERALS[index]}
              </button>
            );
          })}
        </div>

        <p
          className="foil-label mb-4 justify-center border-none p-0 text-[10px]"
          aria-live="polite"
        >
          Chapter {CHAPTER_NUMERALS[activeIndex]} — {active?.label}
        </p>

        <div className={styles.heroCarouselDeck}>
          {samples.map((sample, index) => {
            const layout = getDeckLayout(index, activeIndex, samples.length, !!reducedMotion);
            const isActive = layout.role === "active";
            if (layout.role === "hidden") return null;

            const cardClass = [
              styles.heroCarouselCard,
              isActive ? styles.heroCarouselCardActive : styles.heroCarouselCardPeek,
              isActive ? "foil-border" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <motion.article
                key={sample.id}
                className={cardClass}
                aria-hidden={!isActive}
                animate={deckAnimate(index)}
                transition={deckTransition(index, layout.role)}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--infographic-frame)]">
                  <Image
                    src={sources[index] ?? sample.imageSrc}
                    alt={isActive ? sample.imageAlt : ""}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 72vw, 260px"
                    priority={index === 0}
                    onError={() => handleImageError(index, sample)}
                  />
                </div>
                <p
                  className={`truncate px-3 pb-3 pt-2 text-center text-xs font-semibold transition-opacity ${
                    isActive ? "text-ink opacity-100" : "text-ink-stone opacity-70"
                  }`}
                >
                  {sample.label}
                </p>
              </motion.article>
            );
          })}
        </div>

        {!reducedMotion && (
          <div className={styles.heroCarouselProgress} aria-hidden>
            <div
              key={`${activeIndex}-${paused ? "p" : "r"}`}
              className={`${styles.heroCarouselProgressFill} ${
                paused ? styles.heroCarouselProgressPaused : ""
              }`}
              style={{ "--carousel-progress-ms": `${AUTOPLAY_MS}ms` } as React.CSSProperties}
            />
          </div>
        )}
      </div>
    </div>
  );
}
