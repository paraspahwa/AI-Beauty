import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  StyleGuideResult,
} from "@/types/report";
import { generateGptImageEdit } from "@/lib/ai/gpt-image-infographic";
import {
  buildStyleGuideInfographicPrompt,
  STYLE_GUIDE_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/style-guide";

export interface GenerateStyleGuideInfographicInput {
  imageBuffer: Buffer;
  styleGuide: StyleGuideResult;
  colorAnalysis: ColorAnalysisResult;
  faceShape: FaceShapeResult;
  features: FeatureBreakdown;
  summary?: string;
  quality?: "low" | "medium" | "high";
}

export interface GenerateStyleGuideInfographicResult {
  buffer: Buffer;
  promptVersion: string;
  width: number;
  height: number;
}

export async function generateStyleGuideInfographic(
  input: GenerateStyleGuideInfographicInput,
): Promise<GenerateStyleGuideInfographicResult> {
  const prompt = buildStyleGuideInfographicPrompt(
    input.styleGuide,
    input.colorAnalysis,
    input.faceShape,
    input.features,
    input.summary,
  );

  const buffer = await generateGptImageEdit({
    prompt,
    imageBuffer: input.imageBuffer,
    quality: input.quality ?? "medium",
  });

  const { default: sharp } = await import("sharp");
  const metaImg = await sharp(buffer).metadata();

  return {
    buffer,
    promptVersion: STYLE_GUIDE_PROMPT_VERSION,
    width: metaImg.width ?? 0,
    height: metaImg.height ?? 0,
  };
}
