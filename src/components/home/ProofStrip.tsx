"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { StatItem } from "@/components/home/StatsCounters";

const PINGS = [
  "Priya M. just completed her analysis · Mumbai · 2 min ago",
  "Emma discovered her Soft Autumn palette · 5 min ago",
  "Sarah K. unlocked her spectacles guide · Delhi · 3 min ago",
  "Meera got her AM/PM skin routine · Bangalore · 4 min ago",
  "Rhea picked her perfect frame shape · 6 min ago",
  "Lina found her seasonal color palette · 1 min ago",
];

function AnimatedNumber({ value, durationMs = 1200 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const localRef = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(localRef, { once: true, amount: 0.4 });
  const prefersReducedMotion = useReducedMotion();
  const isInteger = Number.isInteger(value);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, inView, prefersReducedMotion, value]);

  return (
    <span ref={localRef} className="tabular-nums">
      {display.toLocaleString("en-IN", {
        maximumFractionDigits: isInteger ? 0 : 1,
        minimumFractionDigits: isInteger ? 0 : 1,
      })}
    </span>
  );
}

interface ProofStripProps {
  stats: StatItem[];
}

export function ProofStrip({ stats }: ProofStripProps) {
  const [tickerVisible, setTickerVisible] = useState(false);

  useEffect(() => {
    setTickerVisible(true);
  }, []);

  const duplicated = [...PINGS, ...PINGS];

  return (
    <section className="border-y border-terracotta/15 bg-[var(--color-surface)]/60 backdrop-blur-sm">
      <div className="container max-w-6xl py-4 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          {tickerVisible ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                className="animate-marquee-left flex w-max gap-10 whitespace-nowrap text-xs text-ink-stone"
                style={{ "--marquee-duration": "38s" } as React.CSSProperties}
              >
                {duplicated.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="hidden h-8 w-px shrink-0 bg-terracotta/25 lg:block" aria-hidden />

          <motion.div
            className="grid shrink-0 grid-cols-3 gap-3 sm:gap-6"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4 }}
          >
            {stats.map((item) => (
              <div key={item.id} className="text-center lg:text-right">
                <p className="font-display text-xl text-ink sm:text-2xl">
                  {item.prefix}
                  <AnimatedNumber value={item.value} />
                  {item.suffix}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-mist sm:text-xs">
                  {item.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
