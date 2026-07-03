"use client";

import { ActivityTicker } from "@/components/home/ActivityTicker";
import { HeroText } from "@/components/home/HeroText";
import { HeroReportCard } from "@/components/home/HeroReportCard";
import { HeroVideoPortal } from "@/components/home/HeroVideoPortal";
import { LandingJourneyBanner } from "@/components/home/LandingJourneyBanner";
import styles from "@/app/home.module.css";

export function LandingHero() {
  return (
    <div className={`relative isolate overflow-hidden min-h-app-viewport flex flex-col ${styles.heroSurface}`}>
      <ActivityTicker />
      <HeroVideoPortal />
      <div className={`pointer-events-none absolute inset-0 z-[1] ${styles.heroScrim}`} aria-hidden />
      <div
        className={`pointer-events-none absolute inset-0 z-[1] ${styles.heroBackdrop}`}
        aria-hidden
      />
      <div className="page-bleed-x relative z-10 flex flex-1 flex-col pb-10 pt-6 sm:pb-14 sm:pt-8">
        <LandingJourneyBanner />
        <section className="flex flex-1 flex-col justify-center px-2 py-8 sm:px-4 sm:py-10 lg:py-14">
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6 xl:gap-10">
            <div className="relative z-10 lg:pr-4">
              <HeroText />
            </div>
            <div className="relative z-0 lg:-ml-8 xl:-ml-12">
              <HeroReportCard />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs text-ink-stone">
            {["Private uploads", "Fast AI guidance", "Upload → analyze → unlock"].map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-terracotta/20 bg-[var(--color-surface)] px-3 py-1.5 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
