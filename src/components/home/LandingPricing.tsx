"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LandingPlan } from "@/lib/landing-pricing";

interface LandingPricingProps {
  plans: LandingPlan[];
  reportPriceLabel: string;
}

export function LandingPricing({ plans, reportPriceLabel }: LandingPricingProps) {
  return (
    <section id="pricing" className="container max-w-6xl scroll-mt-20 py-16 sm:py-20">
      <div className="text-center">
        <span className="foil-label">Investment</span>
        <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">Simple pricing</h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
          Free face-shape preview, Full Report with six infographics at {reportPriceLabel}, or add a Style Guide after unlock.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.article
            key={plan.name}
            className={
              plan.featured
                ? "dossier-card foil-border relative z-10 md:-mt-2 md:mb-2"
                : "dossier-card"
            }
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
          >
            {plan.featured ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-[var(--btn-fg)]">
                Popular
              </span>
            ) : null}
            {plan.featured ? (
              <span className="inline-flex items-center rounded-full bg-sage/15 px-2.5 py-0.5 text-xs text-sage">
                Launch offer
              </span>
            ) : null}
            <h3 className="mt-1 font-display text-xl text-ink">{plan.name}</h3>
            {plan.originalPrice ? (
              <div className="mt-1 flex items-baseline gap-2">
                <p className="font-display text-3xl text-ink">{plan.price}</p>
                <s className="text-sm text-ink-mist">{plan.originalPrice}</s>
              </div>
            ) : (
              <p className="mt-1 font-display text-3xl text-ink">{plan.price}</p>
            )}
            <p className="mt-1 text-xs text-ink-stone">{plan.note}</p>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-stone">
              {plan.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              variant={plan.featured ? "accent" : "outline"}
              className="mt-8 w-full"
            >
              <Link href={plan.href}>{plan.cta}</Link>
            </Button>
          </motion.article>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-2 rounded-2xl border border-sage/20 bg-sage/5 px-6 py-4 text-center text-sm text-ink-stone">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-sage" />
          Secure checkout and instant infographic delivery
        </div>
        <p className="text-xs text-ink-mist">
          Style Guide is purchased separately after Full Report unlock — not included in the main report price.
        </p>
      </div>
    </section>
  );
}
