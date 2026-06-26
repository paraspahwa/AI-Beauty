import type {
  AnalysisInfographicSectionId,
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  SkinAnalysisResult,
} from "@/types/report";
import { generateGptImageEdit } from "@/lib/ai/gpt-image-infographic";
import {
  buildFaceFeaturesInfographicPrompt,
  FACE_FEATURES_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/face-features";
import { buildSkinInfographicPrompt, SKIN_PROMPT_VERSION } from "@/lib/ai/infographic-prompts/skin";
import { buildColorInfographicPrompt, COLOR_PROMPT_VERSION } from "@/lib/ai/infographic-prompts/color";
import {
  buildHairstyleInfographicPrompt,
  HAIRSTYLE_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/hairstyle";
import {
  buildSpectaclesInfographicPrompt,
  SPECTACLES_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/spectacles";
import {
  buildHairColorInfographicPrompt,
  HAIR_COLOR_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/hair-color";
import {
  buildStyleGuideInfographicPrompt,
  STYLE_GUIDE_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/style-guide";
import { getBlueprintSection } from "@/lib/ai/infographic-sections";

export interface GenerateInfographicInput {
  section: AnalysisInfographicSectionId;
  imageBuffer: Buffer;
  faceShape?: FaceShapeResult;
  features?: FeatureBreakdown;
  skinAnalysis?: SkinAnalysisResult;
  colorAnalysis?: ColorAnalysisResult;
  hairstyle?: HairstyleResult;
  glasses?: GlassesResult;
  summary?: string;
  quality?: "low" | "medium" | "high";
}

export interface GenerateInfographicResult {
  buffer: Buffer;
  promptVersion: string;
  width: number;
  height: number;
}

export async function generateAnalysisInfographic(
  input: GenerateInfographicInput,
): Promise<GenerateInfographicResult> {
  const meta = getBlueprintSection(input.section);
  if (!meta?.generatable) {
    throw new Error(`Section "${input.section}" is not available yet`);
  }

  let prompt: string;
  let promptVersion: string;

  switch (input.section) {
    case "faceFeatures": {
      if (!input.faceShape || !input.features) {
        throw new Error("Face shape and feature analysis are required for this infographic");
      }
      prompt = buildFaceFeaturesInfographicPrompt(input.faceShape, input.features);
      promptVersion = FACE_FEATURES_PROMPT_VERSION;
      break;
    }
    case "skin": {
      if (!input.skinAnalysis) {
        throw new Error("Skin analysis is required for this infographic");
      }
      prompt = buildSkinInfographicPrompt(input.skinAnalysis);
      promptVersion = SKIN_PROMPT_VERSION;
      break;
    }
    case "color": {
      if (!input.colorAnalysis) {
        throw new Error("Color analysis is required for this infographic");
      }
      prompt = buildColorInfographicPrompt(input.colorAnalysis);
      promptVersion = COLOR_PROMPT_VERSION;
      break;
    }
    case "hairstyle": {
      if (!input.faceShape || !input.features || !input.hairstyle) {
        throw new Error("Hairstyle analysis is required for this infographic");
      }
      prompt = buildHairstyleInfographicPrompt(input.faceShape, input.features, input.hairstyle);
      promptVersion = HAIRSTYLE_PROMPT_VERSION;
      break;
    }
    case "spectacles": {
      if (!input.faceShape || !input.glasses) {
        throw new Error("Spectacles analysis is required for this infographic");
      }
      prompt = buildSpectaclesInfographicPrompt(input.faceShape, input.glasses);
      promptVersion = SPECTACLES_PROMPT_VERSION;
      break;
    }
    case "hairColor": {
      if (!input.colorAnalysis || !input.features || !input.hairstyle) {
        throw new Error("Color, feature, and hairstyle analysis are required for this infographic");
      }
      prompt = buildHairColorInfographicPrompt(
        input.colorAnalysis,
        input.features,
        input.hairstyle,
      );
      promptVersion = HAIR_COLOR_PROMPT_VERSION;
      break;
    }
    case "styleGuide": {
      if (!input.colorAnalysis || !input.faceShape || !input.features) {
        throw new Error("Color, face shape, and feature analysis are required for this infographic");
      }
      prompt = buildStyleGuideInfographicPrompt(
        input.colorAnalysis,
        input.faceShape,
        input.features,
        input.summary,
      );
      promptVersion = STYLE_GUIDE_PROMPT_VERSION;
      break;
    }
    default:
      throw new Error(`No generator implemented for section "${input.section}"`);
  }

  const buffer = await generateGptImageEdit({
    prompt,
    imageBuffer: input.imageBuffer,
    quality: input.quality ?? "medium",
  });

  const { default: sharp } = await import("sharp");
  const metaImg = await sharp(buffer).metadata();

  return {
    buffer,
    promptVersion,
    width: metaImg.width ?? 0,
    height: metaImg.height ?? 0,
  };
}
