"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

export interface StatItem {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}

interface StatsCountersProps {
  items: StatItem[];
  durationMs?: number;
}

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

export function StatsCounters({ items, durationMs = 1200 }: StatsCountersProps) {
  return (
    <section className="container max-w-6xl py-8 sm:py-10">
      <motion.div
        className="grid gap-3 rounded-3xl border border-terracotta/20 bg-white/70 p-4 shadow-card sm:grid-cols-3 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.45 }}
      >
        {items.map((item) => (
          <div key={item.id} className="stat-badge">
            <p className="text-3xl font-serif text-ink">
              {item.prefix}
              <AnimatedNumber value={item.value} durationMs={durationMs} />
              {item.suffix}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink-stone">{item.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
