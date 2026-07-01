"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export interface TestimonialItem {
  id: string;
  name: string;
  tag: string;
  quote: string;
}

interface TestimonialsSectionProps {
  items: TestimonialItem[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TestimonialsSection({ items }: TestimonialsSectionProps) {
  return (
    <section className="container max-w-6xl py-16 sm:py-20">
      <div className="mb-2 flex flex-col items-center gap-2 text-center">
        <span className="foil-label">Voices</span>
        <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Loved by thousands</h2>
        <div className="mt-4 flex items-center gap-3">
          <p className="font-display text-5xl text-ink">4.9</p>
          <div className="flex flex-col items-start gap-1">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 260 }}
                >
                  <Star className="h-5 w-5 fill-terracotta text-terracotta" />
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-ink-stone">from 50,000+ analyses</p>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            className="dossier-card relative pt-8"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
          >
            <span
              className="pointer-events-none absolute left-4 top-2 font-display text-5xl leading-none text-terracotta/25"
              aria-hidden
            >
              &ldquo;
            </span>

            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-terracotta/30 bg-blush text-xs font-semibold text-terracotta">
                {initials(item.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-mist">{item.tag}</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-ink-stone italic">{item.quote}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
