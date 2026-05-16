"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOME_CONTENT } from "@/lib/home-content";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export function HeroText() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={containerVariants}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      <motion.span variants={itemVariants} className="section-label">
        {HOME_CONTENT.hero.badge}
      </motion.span>

      <motion.h1
        variants={itemVariants}
        className="mt-4 text-6xl sm:text-7xl lg:text-8xl text-ink leading-[1.05] tracking-tight"
      >
        {HOME_CONTENT.hero.title}{" "}
        <span className="gradient-text font-bold" style={{ filter: "drop-shadow(0 0 28px rgba(236,72,153,0.50))" }}>{HOME_CONTENT.hero.titleAccent}</span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="mt-6 max-w-xl text-base sm:text-lg text-ink-stone leading-relaxed"
      >
        {HOME_CONTENT.hero.description}
      </motion.p>

      <motion.div variants={itemVariants} className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" variant="accent" className="group cta-shimmer cta-glow">
          <Link href={HOME_CONTENT.hero.primaryCta.href}>
            <Camera className="h-4 w-4" />
            {HOME_CONTENT.hero.primaryCta.label}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={HOME_CONTENT.hero.secondaryCta.href}>
            {HOME_CONTENT.hero.secondaryCta.label}
          </Link>
        </Button>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mt-8 flex flex-wrap items-center gap-4 text-sm text-ink-stone"
      >
        <div className="flex -space-x-2">
          {["#EC4899", "#8B5CF6", "#F9A8D4", "#C4B5FD", "#FBCFE8"].map((c, i) => (
            <div
              key={i}
              className="h-8 w-8 rounded-full border-2 border-white ring-1 ring-terracotta/20"
              style={{ background: `radial-gradient(circle at 35% 35%, ${c}55, ${c}cc)` }}
            />
          ))}
        </div>
        <span className="font-medium text-ink">50,000+ analyses</span>
        <span className="text-ink-stone/40">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> ~60 second results
        </span>
        <span className="text-ink-stone/40">·</span>
        <span>No card required</span>
      </motion.div>
    </motion.div>
  );
}
