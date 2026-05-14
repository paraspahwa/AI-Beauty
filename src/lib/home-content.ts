import homeContent from "@/content/home-content.json";
import type { BeforeAfterItem } from "@/components/home/SampleShowcase";
import type { StatItem } from "@/components/home/StatsCounters";

export interface SamplePairConfig {
  id: string;
  title: string;
  tag?: string;
  baseName: string;
  beforeFile?: string;
  afterFile?: string;
  ext?: "jpg" | "jpeg" | "png" | "webp";
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
    pairs: SamplePairConfig[];
    tuning: ShowcaseTuning;
  };
}

export const HOME_CONTENT = homeContent as HomeContentConfig;

function pairPath(baseName: string, side: "before" | "after", ext = "jpg"): string {
  return `/samples/${baseName}-${side}.${ext}`;
}

function normalizeSamplePath(fileName: string): string {
  return fileName.startsWith("/") ? fileName : `/samples/${fileName}`;
}

const DEFAULT_BEFORE_FALLBACK = "/samples/sample-N-before.jpg";
const DEFAULT_AFTER_FALLBACK = "/samples/sample-N-after.jpg";

export function toBeforeAfterItems(): BeforeAfterItem[] {
  return HOME_CONTENT.showcase.pairs.map((pair) => ({
    id: pair.id,
    title: pair.title,
    tag: pair.tag,
    beforeSrc: pair.beforeFile
      ? normalizeSamplePath(pair.beforeFile)
      : pairPath(pair.baseName, "before", pair.ext ?? "jpg"),
    afterSrc: pair.afterFile
      ? normalizeSamplePath(pair.afterFile)
      : pairPath(pair.baseName, "after", pair.ext ?? "jpg"),
    beforeFallbackSrc: DEFAULT_BEFORE_FALLBACK,
    afterFallbackSrc: DEFAULT_AFTER_FALLBACK,
    beforeAlt: pair.beforeAlt ?? "Before AI-guided beauty recommendations",
    afterAlt: pair.afterAlt ?? "After AI-guided beauty recommendations",
  }));
}
