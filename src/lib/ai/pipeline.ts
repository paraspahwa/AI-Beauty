import { detectFaceDetails } from "./rekognition";
import { chatJSON } from "./openai";
import { compressForAI } from "./image";
import {
  normalizeColorAnalysis,
  normalizeFaceShape,
  normalizeFeatures,
  normalizeGlasses,
  normalizeHairstyle,
  normalizeSkinAnalysis,
  normalizeSummary,
} from "./contracts";
import { GENERIC_FACE_SHAPE_LABEL, shouldUseShapeConditioning, blendConfidence } from "./confidence";
import { PipelineStageError, classifyStageError, withRetry } from "./resilience";
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

export interface PipelineStageMeta {
  stage: string;
  durationMs: number;
  degraded: boolean;
}

export interface PipelineMeta {
  totalDurationMs: number;
  stages: PipelineStageMeta[];
  rekognitionAvailable: boolean;
  blendedConfidence: number;
  gptRawConfidence: number;
}

export interface PipelineResult {
  rekognition: unknown;
  faceShape: FaceShapeResult;
  colorAnalysis: ColorAnalysisResult;
  skinAnalysis: SkinAnalysisResult;
  features: FeatureBreakdown;
  glasses: GlassesResult;
  hairstyle: HairstyleResult;
  summary: string;
  meta: PipelineMeta;
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
  const pipelineStart = Date.now();
  const stageMetas: PipelineStageMeta[] = [];

  const compressed = await compressForAI(rawImage, 512);
  const imageBase64 = compressed.toString("base64");

  // 1) Rekognition for landmarks (uses original bytes — better signal)
  const rekStart = Date.now();
  const rekognition = await detectFaceDetails(rawImage).catch((err) => {
    // We don't fail the pipeline if Rekognition is unavailable.
    console.warn("[pipeline] Rekognition failed:", err);
    return null;
  });
  stageMetas.push({ stage: "rekognition", durationMs: Date.now() - rekStart, degraded: rekognition === null });

  // P1-4: Timed + degradation-tracked stage runner
  async function runNormalizedStage<T>(
    stage: string,
    call: () => Promise<unknown>,
    normalize: (input: unknown) => T,
    fallbackValue: unknown,
  ): Promise<T> {
    const t0 = Date.now();
    let degraded = false;
    try {
      const raw = await withRetry(stage, call, 2);
      stageMetas.push({ stage, durationMs: Date.now() - t0, degraded });
      return normalize(raw);
    } catch (err) {
      degraded = true;
      const kind = classifyStageError(err);
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[pipeline:${stage}] degraded with fallback (${kind}): ${message}`);
      stageMetas.push({ stage, durationMs: Date.now() - t0, degraded });
      return normalize(fallbackValue);
    }
  }

  // 2) Face shape — Mini Vision
  let faceShape = await runNormalizedStage(
    "face_shape",
    () =>
      chatJSON<unknown>({
        model: env.openai.miniModel,
        system: SYSTEM_BASE,
        user: FACE_SHAPE_PROMPT,
        imageBase64,
      }),
    normalizeFaceShape,
    { shape: "Soft Oval", traits: ["Balanced proportions", "Natural harmony", "Soft structural features"], confidence: 0.55 },
  );

  // P1-2: Blend GPT confidence with Rekognition detection confidence
  const gptRawConfidence = faceShape.confidence;
  const blendedConfidence = blendConfidence(gptRawConfidence, rekognition);
  // Mutate faceShape so downstream code (shapeForStyling, UI) sees the blended value
  faceShape = { ...faceShape, confidence: blendedConfidence };

  // 3) + 4) Color & skin in parallel — these are the two highest-quality calls
  const [colorAnalysis, skinAnalysis] = await Promise.all([
    runNormalizedStage(
      "color_analysis",
      () =>
        chatJSON<unknown>({
          model: env.openai.visionModel,
          system: SYSTEM_BASE,
          user: COLOR_ANALYSIS_PROMPT,
          imageBase64,
        }),
      normalizeColorAnalysis,
      {},
    ),
    runNormalizedStage(
      "skin_analysis",
      () =>
        chatJSON<unknown>({
          model: env.openai.visionModel,
          system: SYSTEM_BASE,
          user: SKIN_ANALYSIS_PROMPT,
          imageBase64,
        }),
      normalizeSkinAnalysis,
      {},
    ),
  ]);

  const shapeForStyling = shouldUseShapeConditioning(blendedConfidence)
    ? faceShape.shape
    : GENERIC_FACE_SHAPE_LABEL;
  if (shapeForStyling === GENERIC_FACE_SHAPE_LABEL) {
    console.warn(
      "[pipeline] Low blended face-shape confidence; using generic styling prompts",
      { gptRawConfidence, blendedConfidence },
    );
  }

  // 5) Features, 6) Glasses, 7) Hairstyle in parallel (Mini)
  const [features, glasses, hairstyle] = await Promise.all([
    runNormalizedStage(
      "features",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: SYSTEM_BASE,
          user: FEATURES_PROMPT,
          imageBase64,
        }),
      normalizeFeatures,
      {},
    ),
    runNormalizedStage(
      "glasses",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: SYSTEM_BASE,
          user: GLASSES_PROMPT(shapeForStyling),
        }),
      normalizeGlasses,
      {},
    ),
    runNormalizedStage(
      "hairstyle",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: SYSTEM_BASE,
          user: HAIRSTYLE_PROMPT(shapeForStyling),
        }),
      normalizeHairstyle,
      {},
    ),
  ]);

  // 8) Compile summary (Mini, no image)
  let summary: string;
  try {
    const compiledRaw = await withRetry(
      "summary",
      () =>
        chatJSON<unknown>({
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
        }),
      2,
    );
    summary = normalizeSummary(compiledRaw);
  } catch (err) {
    const kind = classifyStageError(err);
    console.warn(`[pipeline:summary] degraded with fallback (${kind})`);
    summary = normalizeSummary({
      summary:
        "Your personalized analysis is ready. Explore each section for recommendations tailored to your facial features, color profile, and style goals.",
    });
  }

  if (!faceShape.shape || !colorAnalysis.season || !skinAnalysis.type) {
    throw new PipelineStageError(
      "pipeline_core",
      "validation",
      "Core analysis outputs are incomplete after normalization",
    );
  }

  const totalDurationMs = Date.now() - pipelineStart;
  // P1-4: Log stage timing summary
  console.info(
    "[pipeline] completed",
    JSON.stringify({
      totalDurationMs,
      blendedConfidence: blendedConfidence.toFixed(3),
      gptRawConfidence: gptRawConfidence.toFixed(3),
      stages: stageMetas.map((s) => `${s.stage}:${s.durationMs}ms${s.degraded ? "(degraded)" : ""}`),
    }),
  );

  return {
    rekognition,
    faceShape,
    colorAnalysis,
    skinAnalysis,
    features,
    glasses,
    hairstyle,
    summary,
    meta: {
      totalDurationMs,
      stages: stageMetas,
      rekognitionAvailable: rekognition !== null,
      blendedConfidence,
      gptRawConfidence,
    },
  };
}
