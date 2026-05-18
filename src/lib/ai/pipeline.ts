import { detectFaceDetails } from "./rekognition";
import { chatJSON } from "./openai";
import { compressForAI, extractClothingColors, cropFaceForSkin } from "./image";
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
import { pickVariant } from "./canary";
import { buildPersonalizedSystemBase } from "./memory";
import { env } from "../env";
import { SYSTEM_BASE, COMPILE_PROMPT, buildColorAnalysisPrompt, buildFeaturesPrompt, buildGlassesPrompt, SKIN_VISION_PROMPT, buildSkinRoutinePrompt } from "@/prompts";
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
  variantId?: string;
}

export interface PipelineStageEvent {
  stage: string;
  status: "started" | "completed";
  durationMs?: number;
  degraded?: boolean;
  variantId?: string;
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
 *  2. gpt-4o-mini  → face shape (vision)
 *  3. gpt-4o-mini  → color analysis (vision)
 *  4. gpt-4o-mini  → skin analysis (vision)
 *  5. gpt-4o-mini  → eyes/nose/lips/cheeks (parallel-ready, single call here)
 *  6. gpt-4o-mini  → glasses (uses face shape)
 *  7. gpt-4o-mini  → hairstyle (uses face shape)
 *  8. gpt-4o-mini  → compile final summary
 *
 * @param rawImage - raw image buffer (JPEG/PNG/WEBP)
 * @param userId   - optional Supabase user id; when provided the pipeline
 *                   fetches stored style prefs and injects them as soft
 *                   prior context into the LLM system prompt.
 */
export async function runAnalysisPipeline(
  rawImage: Buffer,
  userId?: string,
  skinUserContext?: { ageRange?: string; selfReportedFeeling?: string; primaryConcern?: string },
  onStage?: (event: PipelineStageEvent) => void,
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const stageMetas: PipelineStageMeta[] = [];

  const compressed = await compressForAI(rawImage, 512);
  const imageBase64 = compressed.toString("base64");

  // Server-side dominant clothing colour extraction (runs in parallel with Rekognition)
  const [rekognition, clothingInfo] = await Promise.all([
    // 1) Rekognition for landmarks + ALL attributes (uses original bytes — better signal)
    (async () => {
      const rekStart = Date.now();
      onStage?.({ stage: "rekognition", status: "started" });
      const result = await detectFaceDetails(rawImage).catch((err) => {
        console.warn("[pipeline] Rekognition failed:", err);
        return null;
      });
      const durationMs = Date.now() - rekStart;
      const degraded = result === null;
      stageMetas.push({ stage: "rekognition", durationMs, degraded });
      onStage?.({ stage: "rekognition", status: "completed", durationMs, degraded });
      return result;
    })(),
    // Dominant clothing colours (uses raw buffer for full resolution)
    extractClothingColors(rawImage),
  ]);

  // ── Photo quality gate (runs only when Rekognition succeeded) ───────────
  // Rejects obviously bad selfies before any OpenAI call runs, saving cost
  // and giving the user a specific, actionable error message.
  if (rekognition) {
    const faceConf   = rekognition.Confidence ?? 100;
    const sharpness  = (rekognition.Quality as { Sharpness?: number } | undefined)?.Sharpness ?? 100;
    const brightness = (rekognition.Quality as { Brightness?: number } | undefined)?.Brightness ?? 100;
    const eyesOpen   = rekognition.EyesOpen as { Value?: boolean; Confidence?: number } | undefined;

    if (faceConf < 80) {
      throw new PipelineStageError(
        "photo_quality",
        "validation",
        "No clear face detected. Please use a well-lit, front-facing photo.",
      );
    }
    if (sharpness < 15) {
      throw new PipelineStageError(
        "photo_quality",
        "validation",
        "Photo is too blurry. Please retake with a steady hand and good lighting.",
      );
    }
    if (brightness < 10) {
      throw new PipelineStageError(
        "photo_quality",
        "validation",
        "Photo is too dark. Please move to a brighter spot or turn on more lights.",
      );
    }
    if (eyesOpen?.Value === false && (eyesOpen.Confidence ?? 0) > 85) {
      throw new PipelineStageError(
        "photo_quality",
        "validation",
        "Eyes appear closed. Please look at the camera and retake the photo.",
      );
    }

    console.info(
      "[pipeline] photo quality OK",
      `faceConf=${faceConf.toFixed(1)} sharpness=${sharpness.toFixed(1)} brightness=${brightness.toFixed(1)} eyesOpen=${eyesOpen?.Value}`,
    );
  }

  // Extract Phase 4.1 rekognition attributes for injection into Features prompt
  const rekAttrs = rekognition ? {
    ageRange:          rekognition.AgeRange ? `${rekognition.AgeRange.Low}–${rekognition.AgeRange.High}` : undefined,
    wearingGlasses:    rekognition.Eyeglasses?.Value === true,
    wearingSunglasses: rekognition.Sunglasses?.Value === true,
    gender:            rekognition.Gender?.Value?.toLowerCase() as "male" | "female" | undefined,
  } : undefined;

  // Personalized system base: fetches prior prefs from DB (soft prior for repeat users)
  const effectiveSystemBase = userId
    ? await buildPersonalizedSystemBase(userId, SYSTEM_BASE)
    : SYSTEM_BASE;

  console.info("[pipeline] clothing colours extracted:", clothingInfo.clothingColors, `coverage=${Math.round(clothingInfo.clothingCoverage * 100)}%`);

  // Phase 5: High-res face crop for skin analysis (900px vs 512px full image)
  // Runs after rekognition so we have the bounding box. Falls back to full imageBase64 if unavailable.
  const skinBase64: string = await cropFaceForSkin(rawImage, rekognition, 900)
    .then((crop) => {
      if (!crop) return imageBase64;
      console.info("[pipeline] skin face crop created:", crop.byteLength, "bytes");
      return crop.toString("base64");
    })
    .catch(() => imageBase64);

  // P1-4: Timed + degradation-tracked stage runner
  async function runNormalizedStage<T>(
    stage: string,
    call: () => Promise<unknown>,
    normalize: (input: unknown) => T,
    fallbackValue: unknown,
    variantId?: string,
  ): Promise<T> {
    const t0 = Date.now();
    let degraded = false;
    onStage?.({ stage, status: "started", variantId });
    try {
      const raw = await withRetry(stage, call, 2);
      const durationMs = Date.now() - t0;
      stageMetas.push({ stage, durationMs, degraded, variantId });
      onStage?.({ stage, status: "completed", durationMs, degraded, variantId });
      return normalize(raw);
    } catch (err) {
      degraded = true;
      const kind = classifyStageError(err);
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[pipeline:${stage}] degraded with fallback (${kind}): ${message}`);
      const durationMs = Date.now() - t0;
      stageMetas.push({ stage, durationMs, degraded, variantId });
      onStage?.({ stage, status: "completed", durationMs, degraded, variantId });
      return normalize(fallbackValue);
    }
  }

  // 2) Face shape — Mini Vision
  const faceShapeVariant = pickVariant("face_shape");
  let faceShape = await runNormalizedStage(
    "face_shape",
    () =>
      chatJSON<unknown>({
        model: env.openai.miniModel,
        system: effectiveSystemBase,
        user: faceShapeVariant.prompt as string,
        imageBase64,
      }),
    normalizeFaceShape,
    { shape: "Soft Oval", traits: ["Balanced proportions", "Natural harmony", "Soft structural features"], confidence: 0.55 },
    faceShapeVariant.id,
  );

  // P1-2: Blend GPT confidence with Rekognition detection confidence
  const gptRawConfidence = faceShape.confidence;
  const blendedConfidence = blendConfidence(gptRawConfidence, rekognition);
  // Mutate faceShape so downstream code (shapeForStyling, UI) sees the blended value
  faceShape = { ...faceShape, confidence: blendedConfidence };

  // 3) + 4a) Color & skin vision in parallel
  const colorVariant = pickVariant("color_analysis");

  // Build the color prompt: v2 (dominant-colour variant) gets pixel data injected;
  // v1 gets the prompt without clothing colours for baseline comparison.
  const colorPrompt =
    colorVariant.id === "color_v2_dominant"
      ? buildColorAnalysisPrompt({
          clothingColors: clothingInfo.clothingColors,
          clothingCoverage: clothingInfo.clothingCoverage,
        })
      : (colorVariant.prompt as string);

  const [colorAnalysis, skinVisionResult] = await Promise.all([
    runNormalizedStage(
      "color_analysis",
      () =>
      chatJSON<unknown>({
        model: env.openai.miniModel,
        temperature: 0.2,
          system: effectiveSystemBase,
          user: colorPrompt,
          imageBase64,
        }),
      normalizeColorAnalysis,
      {},
      colorVariant.id,
    ),
    // Phase 5: Vision-only skin stage — uses full gpt-4o for better texture accuracy,
    // and a face-cropped image at 900px so pores/tone are readable.
    runNormalizedStage(
      "skin_vision",
      () =>
        chatJSON<unknown>({
          model: env.openai.visionModel,  // gpt-4o — significantly better skin texture reading
          temperature: 0.2,
          system: effectiveSystemBase,
          user: SKIN_VISION_PROMPT,
          imageBase64: skinBase64,         // face crop, not full 512px thumbnail
        }),
      normalizeSkinAnalysis,
      {},
      "skin_vision_v2",
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

  // Phase 4.4 + 4.1: Run skin routine (text, no image) in parallel with Features (vision).
  // Features runs before Glasses so eye/brow data can be injected into the Glasses prompt.
  const featuresVariant = pickVariant("features");
  const [skinRoutineRaw, features] = await Promise.all([
    // Phase 5: Text-only AM/PM routine call — no image tokens, very cheap
    (async () => {
      const t0 = Date.now();
      onStage?.({ stage: "skin_routine", status: "started" });
      const result = await withRetry("skin_routine", () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: effectiveSystemBase,
          user: buildSkinRoutinePrompt(skinVisionResult.type, skinVisionResult.concerns, skinUserContext),
        }), 2,
      ).catch(() => null);
      onStage?.({
        stage: "skin_routine",
        status: "completed",
        durationMs: Date.now() - t0,
        degraded: result === null,
      });
      return result;
    })(),
    // Phase 4.1: Features vision call with Rekognition attributes injected
    runNormalizedStage(
      "features",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: effectiveSystemBase,
          user: buildFeaturesPrompt(rekAttrs),
          imageBase64,
        }),
      normalizeFeatures,
      {},
      featuresVariant.id,
    ),
  ]);

  // Merge AM/PM routine from text stage into the skin vision result
  const skinAnalysis: SkinAnalysisResult = (() => {
    if (!skinRoutineRaw) return skinVisionResult;
    const rawRoutine = (skinRoutineRaw as Record<string, unknown>).routine;

    // New AM/PM object format
    if (rawRoutine && typeof rawRoutine === "object" && !Array.isArray(rawRoutine)) {
      const r = rawRoutine as Record<string, unknown>;
      const normalizeSteps = (arr: unknown[]) =>
        Array.isArray(arr)
          ? arr.map((item) => {
              const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
              return {
                step:    typeof obj.step    === "string" ? obj.step    : "Care step",
                product: typeof obj.product === "string" ? obj.product : "Appropriate product",
              };
            }).slice(0, 6)
          : [];
      const am = normalizeSteps(r.am as unknown[]);
      const pm = normalizeSteps(r.pm as unknown[]);
      if (am.length >= 3 && pm.length >= 3) {
        return { ...skinVisionResult, routine: { am, pm } };
      }
    }

    // Legacy flat array fallback
    if (Array.isArray(rawRoutine)) {
      const merged = rawRoutine
        .map((item) => {
          const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            step:    typeof obj.step    === "string" ? obj.step    : "Care step",
            product: typeof obj.product === "string" ? obj.product : "Appropriate product",
          };
        })
        .slice(0, 6);
      return { ...skinVisionResult, routine: merged.length >= 4 ? merged : skinVisionResult.routine };
    }

    return skinVisionResult;
  })();

  // 6) Glasses, 7) Hairstyle in parallel.
  // Phase 4.3: Glasses now receives eye+brow features from stage 5 for personalized frame colors.
  const glassesVariant = pickVariant("glasses");
  const hairstyleVariant = pickVariant("hairstyle");
  const [glasses, hairstyle] = await Promise.all([
    runNormalizedStage(
      "glasses",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: effectiveSystemBase,
          user: buildGlassesPrompt(shapeForStyling, { eyes: features.eyes, eyebrows: features.eyebrows }),
        }),
      normalizeGlasses,
      {},
      glassesVariant.id,
    ),
    runNormalizedStage(
      "hairstyle",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: effectiveSystemBase,
          user: (hairstyleVariant.prompt as (s: string) => string)(shapeForStyling),
        }),
      normalizeHairstyle,
      {},
      hairstyleVariant.id,
    ),
  ]);

  // 8) Compile summary (Mini, no image)
  const summaryVariant = pickVariant("summary");
  let summary: string;
  const summaryT0 = Date.now();
  onStage?.({ stage: "summary", status: "started", variantId: summaryVariant.id });
  try {
    const compiledRaw = await withRetry(
      "summary",
      () =>
        chatJSON<unknown>({
          model: env.openai.miniModel,
          system: effectiveSystemBase,
          user: `${summaryVariant.prompt}\n\nResults:\n${JSON.stringify({
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
    const durationMs = Date.now() - summaryT0;
    stageMetas.push({ stage: "summary", durationMs, degraded: false, variantId: summaryVariant.id });
    onStage?.({ stage: "summary", status: "completed", durationMs, degraded: false, variantId: summaryVariant.id });
    summary = normalizeSummary(compiledRaw);
  } catch (err) {
    const kind = classifyStageError(err);
    const durationMs = Date.now() - summaryT0;
    stageMetas.push({ stage: "summary", durationMs, degraded: true, variantId: summaryVariant.id });
    onStage?.({ stage: "summary", status: "completed", durationMs, degraded: true, variantId: summaryVariant.id });
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
