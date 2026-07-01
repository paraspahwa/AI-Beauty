"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toReportSampleItems, type ReportSampleItem } from "@/lib/home-content";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "full" | "compact";
  items?: ReportSampleItem[];
  className?: string;
}

function SampleCard({ item }: { item: ReportSampleItem }) {
  const [src, setSrc] = React.useState(item.imageSrc);

  return (
    <article
      className="dossier-card w-[260px] shrink-0 snap-center sm:w-[280px]"
      style={{ scrollSnapAlign: "center" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-ink">{item.label}</p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-stone">{item.description}</p>
        </div>
        {item.tag ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              item.tag === "Free"
                ? "bg-sage/15 text-sage"
                : "bg-terracotta/10 text-terracotta",
            )}
          >
            {item.tag}
          </span>
        ) : null}
      </div>
      <div
        className="relative mt-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--infographic-frame)", aspectRatio: "3/4" }}
      >
        <Image
          src={src}
          alt={item.imageAlt}
          fill
          className="object-contain p-3"
          sizes="280px"
          onError={() => {
            if (src !== item.fallbackSrc) setSrc(item.fallbackSrc);
          }}
        />
      </div>
    </article>
  );
}

export function ReportSampleGallery({
  variant = "full",
  items: itemsProp,
  className,
}: Props) {
  const items = itemsProp ?? toReportSampleItems();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const isCompact = variant === "compact";

  React.useEffect(() => {
    if (isCompact || !videoRef.current) return;
    const el = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isCompact]);

  if (items.length === 0) return null;

  if (isCompact) {
    const active = items[0];
    return (
      <div className={className}>
        <SampleCard item={active} />
      </div>
    );
  }

  return (
    <section id="samples" className={cn("scroll-mt-20 py-16 sm:py-20", className)}>
      <div className="container max-w-6xl">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
        >
          <span className="foil-label">Your dossier includes</span>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl lg:text-5xl">
            Six infographics, <span className="gradient-text italic">one selfie</span>
          </h2>
          <p className="mt-3 text-ink-stone leading-relaxed">
            Each section delivered as a polished graphic you can save, share, and download as a PDF.
          </p>
        </motion.div>

        <div
          className="mt-10 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin"
          role="list"
          aria-label="Report infographic samples"
        >
          {items.map((item) => (
            <SampleCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-terracotta/20 shadow-premium">
          <video
            ref={videoRef}
            src="/e6672f79-03ed-48f9-8259-eacd582aba8d.mp4"
            muted
            loop
            playsInline
            preload="none"
            className="block h-auto w-full"
          />
        </div>

        <div className="mt-8 text-center">
          <Button asChild size="lg" variant="accent" className="group cta-shimmer">
            <Link href="/upload">
              Start free analysis
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
