// Domain types shared between API routes, the analysis pipeline, and React components.

export type ReportStatus = "pending" | "processing" | "ready" | "failed";

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
  eyes: { shape: string; notes: string };
  nose: { shape: string; notes: string };
  lips: { shape: string; notes: string };
  cheeks: { shape: string; notes: string };
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
  status: "ready" | "failed" | "missing";
  mime: string;
  width?: number;
  height?: number;
  error?: string | null;
  signedUrl?: string;
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
  };
}

export interface PipelineMeta {
  totalDurationMs: number;
  rekognitionAvailable: boolean;
  blendedConfidence: number;
  gptRawConfidence: number;
  stages: { stage: string; durationMs: number; degraded: boolean }[];
}

export interface CompiledReport {
  id: string;
  userId: string;
  imageUrl: string;
  status: ReportStatus;
  isPaid: boolean;
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
  createdAt: string;
}
