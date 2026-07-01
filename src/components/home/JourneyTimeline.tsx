"use client";

import { motion } from "framer-motion";
import type { LandingStep } from "@/lib/landing-content";

interface JourneyTimelineProps {
  steps: LandingStep[];
}

export function JourneyTimeline({ steps }: JourneyTimelineProps) {
  return (
    <section id="how" className="container max-w-6xl scroll-mt-20 py-16 sm:py-20">
      <div className="text-center">
        <span className="foil-label">The journey</span>
        <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">How it works</h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
          Five steps from free preview to your complete beauty profile.
        </p>
      </div>

      <div className="relative mt-12 hidden lg:block">
        <div
          className="absolute left-[10%] right-[10%] top-8 h-px bg-gradient-to-r from-transparent via-terracotta/40 to-transparent"
          aria-hidden
        />
        <ol className="grid grid-cols-5 gap-4">
          {steps.map((step, index) => (
            <motion.li
              key={step.title}
              className="relative text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <span className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-terracotta/30 bg-[var(--color-surface)] font-display text-lg text-terracotta shadow-sm">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-stone leading-relaxed">{step.description}</p>
            </motion.li>
          ))}
        </ol>
      </div>

      <ol className="relative mt-10 space-y-0 lg:hidden">
        {steps.map((step, index) => (
          <motion.li
            key={step.title}
            className="relative flex gap-4 pb-8 last:pb-0"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
          >
            {index < steps.length - 1 ? (
              <span
                className="absolute left-5 top-12 bottom-0 w-px bg-terracotta/25"
                aria-hidden
              />
            ) : null}
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-terracotta/30 bg-[var(--color-surface)] text-sm font-semibold text-terracotta">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="pt-1">
              <h3 className="font-display text-lg text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-stone leading-relaxed">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
