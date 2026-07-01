"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HOME_CONTENT } from "@/lib/home-content";

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden py-20 sm:py-28">
      <Image
        src="/1779024298.png"
        alt=""
        fill
        aria-hidden
        className="object-cover object-center -z-20"
        sizes="100vw"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-espresso/92 via-espresso/85 to-[#3d2418]/90"
        aria-hidden
      />
      <div className="container max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <span className="foil-label border-rose-gold/40 text-rose-gold">
            Ready when you are
          </span>
          <h2 className="mt-5 font-display text-3xl text-[#fffcf8] sm:text-5xl leading-tight">
            {HOME_CONTENT.ctaBanner.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#fffcf8]/75 leading-relaxed sm:text-lg">
            {HOME_CONTENT.ctaBanner.description}
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="group bg-terracotta text-[#fffcf8] hover:bg-terracotta-dark cta-shimmer cta-glow"
            >
              <Link href={HOME_CONTENT.ctaBanner.buttonHref}>
                {HOME_CONTENT.ctaBanner.buttonLabel}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
