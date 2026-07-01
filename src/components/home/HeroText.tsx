"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOME_CONTENT } from "@/lib/home-content";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
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
      <motion.span variants={itemVariants} className="foil-label">
        {HOME_CONTENT.hero.badge}
      </motion.span>

      <motion.h1
        variants={itemVariants}
        className="mt-5 font-display text-4xl text-ink leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
      >
        {HOME_CONTENT.hero.title}{" "}
        <span className="gradient-text italic">{HOME_CONTENT.hero.titleAccent}</span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="mt-6 max-w-lg text-base text-ink-stone leading-relaxed sm:text-lg"
      >
        {HOME_CONTENT.hero.description}
      </motion.p>

      <motion.div variants={itemVariants} className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" variant="accent" className="group cta-shimmer cta-glow">
          <Link href={HOME_CONTENT.hero.primaryCta.href}>
            <Camera className="h-4 w-4" />
            {HOME_CONTENT.hero.primaryCta.label}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
        className="mt-8 flex flex-wrap items-center gap-3 text-sm text-ink-stone"
      >
        <span className="font-medium text-ink">50,000+ analyses</span>
        <span className="text-ink-mist/50">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-terracotta" /> ~60 second results
        </span>
        <span className="text-ink-mist/50">·</span>
        <span>No card required</span>
      </motion.div>
    </motion.div>
  );
}
