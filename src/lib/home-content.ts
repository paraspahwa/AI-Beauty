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

type SampleSide = "before" | "after";

const LABELLED_SAMPLE_BASES = ["sample-1", "sample-2", "sample-3"] as const;
type LabelledSampleBase = (typeof LABELLED_SAMPLE_BASES)[number];
const LABELLED_SAMPLE_BASE_SET: ReadonlySet<LabelledSampleBase> = new Set(LABELLED_SAMPLE_BASES);

function isLabelledSampleBase(baseName: string): baseName is LabelledSampleBase {
  return LABELLED_SAMPLE_BASE_SET.has(baseName as LabelledSampleBase);
}

function getFallbackBaseName(baseName: string): string {
  return isLabelledSampleBase(baseName) ? baseName : "sample-N";
}

function getFallbackSrc(baseName: string, side: SampleSide): string {
  const fallbackBaseName = getFallbackBaseName(baseName);
  return side === "before"
    ? `/samples/${fallbackBaseName}-before.jpg`
    : `/samples/${fallbackBaseName}-after.jpg`;
}

function getDefaultAlt(baseName: string, side: SampleSide): string {
  const fallbackBaseName = getFallbackBaseName(baseName);
  return `${fallbackBaseName} ${side}`;
}

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
    beforeFallbackSrc: getFallbackSrc(pair.baseName, "before"),
    afterFallbackSrc: getFallbackSrc(pair.baseName, "after"),
    beforeAlt: pair.beforeAlt ?? getDefaultAlt(pair.baseName, "before"),
    afterAlt: pair.afterAlt ?? getDefaultAlt(pair.baseName, "after"),
  }));
}
