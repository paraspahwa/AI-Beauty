import { env } from "@/lib/env";
import { SYSTEM_BASE, buildStyleGuideFromBodyPrompt } from "@/prompts";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  StyleGuideResult,
} from "@/types/report";
import { normalizeStyleGuide } from "./contracts";
import { compressForAI } from "./image";
import { buildPersonalizedSystemBase } from "./memory";
import { chatJSON } from "./openai";

export async function runStyleGuideAnalysis(opts: {
  imageBuffer: Buffer;
  faceShape: FaceShapeResult;
  colorAnalysis: ColorAnalysisResult;
  features: FeatureBreakdown;
  summary?: string | null;
  userId?: string;
}): Promise<StyleGuideResult> {
  const compressed = await compressForAI(opts.imageBuffer, 512);
  const imageBase64 = compressed.toString("base64");
  const system = opts.userId
    ? await buildPersonalizedSystemBase(opts.userId, SYSTEM_BASE)
    : SYSTEM_BASE;

  const raw = await chatJSON<unknown>({
    model: env.openai.visionModel,
    temperature: 0.3,
    system,
    user: buildStyleGuideFromBodyPrompt(
      opts.faceShape.shape,
      opts.colorAnalysis.season,
      opts.colorAnalysis.undertone,
      {
        faceShape: opts.faceShape,
        colorAnalysis: opts.colorAnalysis,
        features: opts.features,
        summary: opts.summary ?? undefined,
      },
    ),
    imageBase64,
  });

  return normalizeStyleGuide(raw);
}
