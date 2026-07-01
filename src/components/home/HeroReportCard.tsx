"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { toReportSampleItems } from "@/lib/home-content";
import styles from "@/app/home.module.css";

const FAN_POSITIONS = [styles.fanPos0, styles.fanPos1, styles.fanPos2] as const;

export function HeroReportCard() {
  const samples = useMemo(() => toReportSampleItems().slice(0, 3), []);
  const [sources, setSources] = useState(() => samples.map((s) => s.imageSrc));

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-sm sm:max-w-md lg:max-w-none lg:min-h-[420px]">
      <div className="absolute left-0 top-0 z-10 rounded-full border border-terracotta/30 bg-[var(--color-surface)]/90 px-3 py-1.5 text-xs font-semibold text-terracotta backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Sample dossier
        </span>
      </div>

      {samples.map((sample, index) => (
        <div
          key={sample.id}
          className={`${styles.heroFanCard} ${FAN_POSITIONS[index] ?? styles.fanPos0}`}
          style={{ animationDelay: `${index * 1.5}s` }}
        >
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={sources[index] ?? sample.imageSrc}
              alt={sample.imageAlt}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 40vw, 220px"
              priority={index === 0}
              onError={() => {
                setSources((prev) => {
                  const next = [...prev];
                  if (next[index] !== sample.fallbackSrc) {
                    next[index] = sample.fallbackSrc;
                  }
                  return next;
                });
              }}
            />
          </div>
          <p className="truncate px-2 pb-2 text-center text-[10px] font-medium text-ink-stone">
            {sample.label}
          </p>
        </div>
      ))}
    </div>
  );
}
