import { detectFaceDetails } from "./rekognition";
import { chatJSON } from "./openai";
import { compressForAI } from "./image";
import { env } from "../env";
import {
  COLOR_ANALYSIS_PROMPT,
  COMPILE_PROMPT,
  FACE_SHAPE_PROMPT,
  FEATURES_PROMPT,
  GLASSES_PROMPT,
  HAIRSTYLE_PROMPT,
  SKIN_ANALYSIS_PROMPT,
  SYSTEM_BASE,
} from "@/prompts";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  SkinAnalysisResult,
} from "@/types/report";

export interface PipelineResult {
  rekognition: unknown;
  faceShape: FaceShapeResult;
  colorAnalysis: ColorAnalysisResult;
  skinAnalysis: SkinAnalysisResult;
  features: FeatureBreakdown;
  glasses: GlassesResult;
  hairstyle: HairstyleResult;
  summary: string;
}

/**
 * Run the full analysis pipeline on a raw image buffer.
 * Order:
 *  1. AWS Rekognition DetectFaces (landmarks)
 *  2. GPT-4o-mini Vision  → face shape
 *  3. GPT-4o Vision       → color analysis
 *  4. GPT-4o Vision       → skin analysis
 *  5. GPT-4o-mini         → eyes/nose/lips/cheeks (parallel-ready, single call here)
 *  6. GPT-4o-mini         → glasses (uses face shape)
 *  7. GPT-4o-mini         → hairstyle (uses face shape)
 *  8. GPT-4o-mini         → compile final summary
 */
export async function runAnalysisPipeline(rawImage: Buffer): Promise<PipelineResult> {
  const compressed = await compressForAI(rawImage, 512);
  const imageBase64 = compressed.toString("base64");

  // 1) Rekognition for landmarks (uses original bytes — better signal)
  const rekognition = await detectFaceDetails(rawImage).catch((err) => {
    // We don't fail the pipeline if Rekognition is unavailable.
    console.warn("[pipeline] Rekognition failed:", err);
    return null;
  });

  // 2) Face shape — Mini Vision
  const faceShape = await chatJSON<FaceShapeResult>({
    model: env.openai.miniModel,
    system: SYSTEM_BASE,
    user: FACE_SHAPE_PROMPT,
    imageBase64,
  });

  // 3) + 4) Color & skin in parallel — these are the two highest-quality calls
  const [colorAnalysis, skinAnalysis] = await Promise.all([
    chatJSON<ColorAnalysisResult>({
      model: env.openai.visionModel,
      system: SYSTEM_BASE,
      user: COLOR_ANALYSIS_PROMPT,
      imageBase64,
    }),
    chatJSON<SkinAnalysisResult>({
      model: env.openai.visionModel,
      system: SYSTEM_BASE,
      user: SKIN_ANALYSIS_PROMPT,
      imageBase64,
    }),
  ]);

  // 5) Features, 6) Glasses, 7) Hairstyle in parallel (Mini)
  const [features, glasses, hairstyle] = await Promise.all([
    chatJSON<FeatureBreakdown>({
      model: env.openai.miniModel,
      system: SYSTEM_BASE,
      user: FEATURES_PROMPT,
      imageBase64,
    }),
    chatJSON<GlassesResult>({
      model: env.openai.miniModel,
      system: SYSTEM_BASE,
      user: GLASSES_PROMPT(faceShape.shape),
    }),
    chatJSON<HairstyleResult>({
      model: env.openai.miniModel,
      system: SYSTEM_BASE,
      user: HAIRSTYLE_PROMPT(faceShape.shape),
    }),
  ]);

  // 8) Compile summary (Mini, no image)
  const compiled = await chatJSON<{ summary: string }>({
    model: env.openai.miniModel,
    system: SYSTEM_BASE,
    user: `${COMPILE_PROMPT}\n\nResults:\n${JSON.stringify({
      faceShape,
      colorAnalysis,
      skinAnalysis,
      features,
      glasses,
      hairstyle,
    })}`,
  });

  return {
    rekognition,
    faceShape,
    colorAnalysis,
    skinAnalysis,
    features,
    glasses,
    hairstyle,
    summary: compiled.summary,
  };
}
