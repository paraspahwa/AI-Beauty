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
    <section className="container max-w-6xl py-16">
      <h2 className="text-center text-3xl text-ink sm:text-4xl">Loved by thousands</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            className="card-soft"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-terracotta/35 bg-[linear-gradient(135deg,rgba(236,72,153,0.16),rgba(139,92,246,0.22))] text-xs font-semibold text-ink">
                {initials(item.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-mist">{item.tag}</p>
              </div>
            </div>

            <div className="mb-3 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-terracotta text-terracotta" />
              ))}
            </div>

            <p className="text-sm leading-relaxed text-ink-stone">&ldquo;{item.quote}&rdquo;</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
