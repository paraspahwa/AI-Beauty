"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type OverlayChip = {
  label: string;
  chipClass: string;
  lineClass: string;
  dotClass: string;
};

type StoryPanel = {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  tintClass: string;
  chips: OverlayChip[];
};

const PANELS: StoryPanel[] = [
  {
    id: "makeup",
    title: "AI Makeup Studio",
    subtitle: "Match shades to your undertone and facial harmony instantly.",
    imageSrc: "/samples/sample-1-after.jpg",
    imageAlt: "AI makeup try-on result preview",
    tintClass: "from-[#ec4899]/35 via-transparent to-black/55",
    chips: [
      {
        label: "Peach Glow",
        chipClass: "left-3 top-4",
        lineClass: "left-[114px] top-[44px] w-16 rotate-[24deg]",
        dotClass: "left-[172px] top-[74px]",
      },
      {
        label: "Coral Lip Match",
        chipClass: "right-3 top-24",
        lineClass: "right-[114px] top-[126px] w-14 -rotate-[20deg]",
        dotClass: "right-[166px] top-[103px]",
      },
      {
        label: "Champagne Highlight",
        chipClass: "right-3 bottom-20",
        lineClass: "right-[128px] bottom-[95px] w-12 rotate-[18deg]",
        dotClass: "right-[174px] bottom-[115px]",
      },
    ],
  },
  {
    id: "hair",
    title: "Hairstyle Guide",
    subtitle: "See cuts that balance your face shape before committing.",
    imageSrc: "/samples/sample-2-after.jpg",
    imageAlt: "AI hairstyle recommendation preview",
    tintClass: "from-[#a16207]/30 via-transparent to-black/55",
    chips: [
      {
        label: "Textured Bob",
        chipClass: "left-3 top-4",
        lineClass: "left-[116px] top-[44px] w-14 rotate-[18deg]",
        dotClass: "left-[166px] top-[60px]",
      },
      {
        label: "Face Shape: Heart",
        chipClass: "left-3 top-16",
        lineClass: "left-[136px] top-[90px] w-12 rotate-[30deg]",
        dotClass: "left-[177px] top-[116px]",
      },
      {
        label: "Try-On Complete",
        chipClass: "right-3 bottom-20",
        lineClass: "right-[116px] bottom-[98px] w-16 -rotate-[22deg]",
        dotClass: "right-[172px] bottom-[80px]",
      },
    ],
  },
  {
    id: "frames",
    title: "Spectacles Geometry",
    subtitle: "Frames and tones chosen for your features and undertone.",
    imageSrc: "/samples/sample-3-after.jpg",
    imageAlt: "AI spectacles recommendation preview",
    tintClass: "from-[#0ea5a4]/28 via-transparent to-black/55",
    chips: [
      {
        label: "Geometric Frames",
        chipClass: "left-3 top-4",
        lineClass: "left-[132px] top-[44px] w-14 rotate-[16deg]",
        dotClass: "left-[182px] top-[58px]",
      },
      {
        label: "Undertone: Warm",
        chipClass: "right-3 top-16",
        lineClass: "right-[126px] top-[90px] w-12 -rotate-[26deg]",
        dotClass: "right-[173px] top-[68px]",
      },
      {
        label: "AI Fit: Confident",
        chipClass: "left-3 bottom-20",
        lineClass: "left-[124px] bottom-[97px] w-16 -rotate-[18deg]",
        dotClass: "left-[182px] bottom-[79px]",
      },
    ],
  },
];

const CHIP_FLOAT = {
  y: [0, -2, 0],
  transition: {
    duration: 2.8,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

function PanelCard({ panel }: { panel: StoryPanel }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="group relative min-w-[285px] snap-start overflow-hidden rounded-3xl border border-terracotta/20 bg-white shadow-xl shadow-terracotta/10 sm:min-w-0"
    >
      <div className="relative h-[420px] w-full">
        <Image
          src={panel.imageSrc}
          alt={panel.imageAlt}
          fill
          sizes="(max-width: 768px) 86vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />

        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${panel.tintClass}`} />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.11, delayChildren: 0.18 } },
          }}
          className="absolute inset-0"
        >
          {panel.chips.map((chip) => (
            <motion.div
              key={chip.label}
              variants={{ hidden: { opacity: 0, y: 8, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              animate={CHIP_FLOAT}
              className={`absolute ${chip.chipClass} overflow-hidden rounded-2xl border border-white/35 bg-white/84 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-0.5`}
            >
              {chip.label}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-8 w-5 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                animate={{ x: [0, 140] }}
                transition={{ duration: 1.9, repeat: Infinity, repeatDelay: 1.3, ease: "easeInOut" }}
              />
            </motion.div>
          ))}

          {panel.chips.map((chip) => (
            <motion.span
              key={`${chip.label}-line`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: [0.35, 0.75, 0.35] }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
              className={`pointer-events-none absolute ${chip.lineClass} origin-left h-px bg-white/55`}
            />
          ))}

          {panel.chips.map((chip) => (
            <motion.span
              key={`${chip.label}-dot`}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ scale: [1, 1.2, 1], opacity: [0.65, 1, 0.65] }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
              className={`pointer-events-none absolute ${chip.dotClass} h-2 w-2 rounded-full border border-white/65 bg-white/75`}
            />
          ))}
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="text-lg font-semibold leading-tight">{panel.title}</h3>
          <p className="mt-1 text-sm text-white/80">{panel.subtitle}</p>
        </div>
      </div>
    </motion.article>
  );
}

export function AiStoryPanels() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="container max-w-6xl py-14 sm:py-16"
    >
      <div className="rounded-[2rem] border border-terracotta/20 bg-[linear-gradient(165deg,rgba(255,246,250,0.95),rgba(255,255,255,0.94))] p-6 shadow-card sm:p-8">
        <div className="text-center">
          <span className="section-label">AI Visual Story</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            See Your <span className="gradient-text">Style Intelligence</span> In Action
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-ink-stone">
            One selfie turns into a complete styling narrative: makeup harmony, haircut confidence, and frame geometry tailored to you.
          </p>
        </div>

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {PANELS.map((panel) => (
            <PanelCard key={panel.id} panel={panel} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" variant="accent" className="group">
            <Link href="/upload">
              Start Free Analysis
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
