"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="mt-8 space-y-3">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <article key={item.id} className="card-soft">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
              aria-controls={`faq-panel-${item.id}`}
            >
              <span className="font-medium text-ink">{item.question}</span>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-terracotta" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={`faq-panel-${item.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="mt-3 text-sm leading-relaxed text-ink-stone">{item.answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
