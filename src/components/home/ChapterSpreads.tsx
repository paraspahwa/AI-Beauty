"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fmtInr } from "@/lib/landing-pricing";
import { publicEnv } from "@/lib/public-env";

type Chapter = {
  id: string;
  label: string;
  title: string;
  pullQuote: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  tags: string[];
  imageLeft: boolean;
};

const SEASONS = ["Warm Autumn", "Soft Summer", "Clear Spring", "True Winter", "Deep Autumn", "Light Spring"];

function buildChapters(): Chapter[] {
  const styleGuidePrice = fmtInr(publicEnv.razorpay.styleGuidePriceINR);

  return [
    {
      id: "colour",
      label: "Chapter I",
      title: "Know which colours light you up",
      pullQuote: "Your season tells you which shades make you glow — and which wash you out.",
      body: "Renovaara identifies your colour season from a single selfie and builds a curated palette for clothing, makeup, and metals.",
      imageSrc: "/1779024304.png",
      imageAlt: "Renovaara colour season palette on iPhone",
      tags: SEASONS.slice(0, 4),
      imageLeft: true,
    },
    {
      id: "skin",
      label: "Chapter II",
      title: "Skin analysis & routine",
      pullQuote: "AM and PM guidance tailored to your skin type — not generic advice.",
      body: "Your skin infographic maps concerns to a practical routine you can follow and share with your dermatologist or aesthetician.",
      imageSrc: "/samples/sample-4-after.jpg",
      imageAlt: "AI skin analysis infographic preview",
      tags: ["Hydration", "AM / PM", "Barrier support", "Concerns"],
      imageLeft: false,
    },
    {
      id: "style-guide",
      label: "Chapter III",
      title: `Style Guide add-on — ${styleGuidePrice}`,
      pullQuote: "Wardrobe direction from a full-body photo, purchased separately after unlock.",
      body: "Upload a full-body image anytime after your Full Report to receive silhouettes, essentials, and accent colours matched to your season — plus a separate PDF.",
      imageSrc: "/1779024309.png",
      imageAlt: "Renovaara Style Guide wardrobe infographic",
      tags: ["Full-body upload", "Separate PDF", "Optional", "After unlock"],
      imageLeft: true,
    },
  ];
}

function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  const imageBlock = (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-terracotta/15 shadow-card">
      <Image
        src={chapter.imageSrc}
        alt={chapter.imageAlt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );

  const textBlock = (
    <div className="flex flex-col justify-center">
      <span className="foil-label w-fit">{chapter.label}</span>
      <blockquote className="mt-4 font-display text-2xl text-ink leading-snug sm:text-3xl">
        &ldquo;{chapter.pullQuote}&rdquo;
      </blockquote>
      <h3 className="mt-4 font-display text-xl text-terracotta">{chapter.title}</h3>
      <p className="mt-3 text-ink-stone leading-relaxed">{chapter.body}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {chapter.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-terracotta/25 bg-blush/60 px-3 py-1 text-xs text-ink-stone"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <motion.article
      className="grid items-center gap-10 md:grid-cols-2 md:gap-14"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      {chapter.imageLeft ? (
        <>
          {imageBlock}
          {textBlock}
        </>
      ) : (
        <>
          <div className="md:order-2">{imageBlock}</div>
          <div className="md:order-1">{textBlock}</div>
        </>
      )}
    </motion.article>
  );
}

export function ChapterSpreads() {
  const chapters = buildChapters();

  return (
    <section id="features" className="scroll-mt-20 bg-blush/40 py-16 sm:py-24">
      <div className="container max-w-6xl space-y-20 sm:space-y-28">
        <div className="text-center">
          <span className="foil-label">Inside your dossier</span>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl lg:text-5xl">
            Three chapters that <span className="gradient-text italic">change everything</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
            Hairstyle, spectacles, and hair colour infographics are included in your Full Report — preview them above.
          </p>
        </div>

        {chapters.map((chapter, index) => (
          <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
        ))}
      </div>
    </section>
  );
}
