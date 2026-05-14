import homeContent from "@/content/home-content.json";
import type { BeforeAfterItem } from "@/components/home/SampleShowcase";
import type { StatItem } from "@/components/home/StatsCounters";

export interface SamplePairConfig {
  id: string;
  title: string;
  tag?: string;
  baseName: string;
  ext?: "jpg" | "jpeg" | "png" | "webp";
  fallbackBeforeIndex: number;
  fallbackAfterIndex: number;
  beforeAlt?: string;
  afterAlt?: string;
}

export interface ShowcaseTuning {
  marqueeLeftSeconds: number;
  marqueeRightSeconds: number;
  cardWidthClass: string;
  cardHeightClass: string;
  rowGapClass: string;
}

interface HomeContentConfig {
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  ctaBanner: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
  };
  stats: StatItem[];
  showcase: {
    fallbackSingles: string[];
    pairs: SamplePairConfig[];
    tuning: ShowcaseTuning;
  };
}

export const HOME_CONTENT = homeContent as HomeContentConfig;

function pairPath(baseName: string, side: "before" | "after", ext = "jpg"): string {
  return `/samples/${baseName}-${side}.${ext}`;
}

function pickFallback(singles: string[], index: number): string {
  if (index >= 0 && index < singles.length) return singles[index];
  return singles[0] ?? "/samples/sample-1.jpg";
}

export function toBeforeAfterItems(): BeforeAfterItem[] {
  const singles = HOME_CONTENT.showcase.fallbackSingles;

  return HOME_CONTENT.showcase.pairs.map((pair) => ({
    id: pair.id,
    title: pair.title,
    tag: pair.tag,
    beforeSrc: pairPath(pair.baseName, "before", pair.ext ?? "jpg"),
    afterSrc: pairPath(pair.baseName, "after", pair.ext ?? "jpg"),
    beforeFallbackSrc: pickFallback(singles, pair.fallbackBeforeIndex),
    afterFallbackSrc: pickFallback(singles, pair.fallbackAfterIndex),
    beforeAlt: pair.beforeAlt ?? "Before AI-guided beauty recommendations",
    afterAlt: pair.afterAlt ?? "After AI-guided beauty recommendations",
  }));
}
