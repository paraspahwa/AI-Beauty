// Domain types shared between API routes, the analysis pipeline, and React components.

export type ReportStatus = "pending" | "processing" | "ready" | "failed";

/** Mirror of src/lib/entitlement.ts — kept here for client-safe import from report types. */
export type PlanTier = "free" | "report" | "studio_pro";

export interface StudioEntitlement {
  tier: PlanTier;
  /** Monthly AI gens remaining. null for free/report (not metered at account level). */
  remainingGens: number | null;
  /** Monthly AI gens used this period. null for free/report. */
  usedGens: number | null;
  /** Hard cap for this tier. 150 for studio_pro, null otherwise. */
  cap: number | null;
  /** ISO date string of next period reset. null for free/report. */
  periodResets: string | null;
  /** Supabase UUID of the active subscription row. null if no subscription. */
  subscriptionId: string | null;
}

export type ColorSeason =
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter"
  | "Soft Spring"
  | "Soft Summer"
  | "Soft Autumn"
  | "Deep Winter"
  | "Deep Autumn"
  | "Bright Spring"
  | "Bright Winter"
  | "Light Spring"
  | "Light Summer";

export type FaceShape =
  | "Oval"
  | "Soft Oval"
  | "Round"
  | "Square"
  | "Heart"
  | "Diamond"
  | "Oblong"
  | "Triangle";

export interface FaceShapeResult {
  shape: FaceShape;
  traits: string[];
  confidence: number; // 0..1
}

export interface ColorAnalysisResult {
  season: ColorSeason;
  undertone: "Warm" | "Cool" | "Neutral";
  description: string;
  palette: { name: string; hex: string }[];
  metals: ("Gold" | "Silver" | "Rose Gold" | "Bronze" | "Platinum")[];
  avoidColors: { name: string; hex: string }[];
  /** Real-world clothing colour evidence extracted from the photo. */
  clothingObservation?: {
    color: string;
    hex: string;
    effect: "flattering" | "clashing" | "neutral";
  };
}

export interface SkinAnalysisResult {
  type: "Oily" | "Dry" | "Combination" | "Normal" | "Sensitive";
  concerns: string[];
  zones: { zone: string; observation: string }[];
  routine: { step: string; product: string }[];
}

export interface FeatureBreakdown {
  eyes:     { shape: string; notes: string };
  eyebrows: { shape: string; notes: string };
  nose:     { shape: string; notes: string };
  lips:     { shape: string; notes: string };
  cheeks:   { shape: string; notes: string };
}

export interface GlassesResult {
  goals: string[]; // "Maintain balance", "Add definition" ...
  recommended: { style: string; reason: string }[]; // 5 styles
  avoid: { style: string; reason: string }[];
  colors: { name: string; hex: string }[];
  fitTips: string[];
}

export interface HairstyleResult {
  styles: { name: string; description: string }[];
  lengths: { name: string; description: string }[];
  colors: { name: string; hex: string; description: string }[];
  avoid: string[];
  stylingTips?: string[];
  hairType?: string;
}

export interface ReportVisualAsset {
  path: string;
  status: "ready" | "failed" | "missing" | "pending";
  mime: string;
  width?: number;
  height?: number;
  error?: string | null;
  signedUrl?: string;
  /** Human-readable name of the style/look this asset represents (e.g. "Bold Lip", "Aviator"). */
  styleName?: string;
}

export interface ReportVisualAssets {
  version: number;
  bucket: string;
  basePath: string;
  assets: {
    landmarkOverlay?: ReportVisualAsset;
    paletteBoard?: ReportVisualAsset;
    glassesPreviews?: ReportVisualAsset[];
    hairstylePreviews?: ReportVisualAsset[];
    /**
     * AI-generated clothing colour previews.
     * Indices 0-5  = bestColors[0-5]
     * Indices 6-11 = avoidColors[0-5]
     */
    colorSwatchPreviews?: ReportVisualAsset[];
    /**
     * AI-generated makeup try-on previews (premium only).
     * Index 0 — Everyday Natural
     * Index 1 — Bold Lip
     * Index 2 — Smoky Eye
     * Index 3 — Full Glam
     * Colors are derived from the user's seasonal palette.
     */
    makeupPreviews?: ReportVisualAsset[];
  };
}

export interface PipelineMeta {
  totalDurationMs: number;
  rekognitionAvailable: boolean;
  blendedConfidence: number;
  gptRawConfidence: number;
  stages: { stage: string; durationMs: number; degraded: boolean }[];
}

/** Auto-detected face landmark dot positions (0-1 fractions of image size). */
export interface FaceLandmarks {
  faceShape: { x: number; y: number };
  eyes:      { x: number; y: number };
  nose:      { x: number; y: number };
  eyebrows:  { x: number; y: number };
  cheeks:    { x: number; y: number };
  lips:      { x: number; y: number };
}

export interface CompiledReport {
  id: string;
  userId: string;
  imageUrl: string;
  status: ReportStatus;
  isPaid: boolean;
  /** Entitlement for AI Studio — governs generation gating and monthly quota. */
  studioEntitlement?: StudioEntitlement;
  shareToken?: string | null;
  faceShape?: FaceShapeResult;
  colorAnalysis?: ColorAnalysisResult;
  skinAnalysis?: SkinAnalysisResult;
  features?: FeatureBreakdown;
  glasses?: GlassesResult;
  hairstyle?: HairstyleResult;
  visualAssets?: ReportVisualAssets;
  summary?: string;
  pipelineMeta?: PipelineMeta;
  faceLandmarks?: FaceLandmarks;
  createdAt: string;
}
