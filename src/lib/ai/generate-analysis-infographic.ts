import type {
  AnalysisInfographicSectionId,
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  SkinAnalysisResult,
} from "@/types/report";
import { cropFaceForInfographic } from "@/lib/ai/image";
import { generateGptImageEdit } from "@/lib/ai/gpt-image-infographic";
import {
  buildSkinInfographicPrompt,
  SKIN_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/skin";
import {
  buildFaceFeaturesInfographicPrompt,
  FACE_FEATURES_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/face-features";
import {
  buildFaceShapePreviewPrompt,
  FACE_SHAPE_PREVIEW_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/face-shape-preview";
import {
  buildHairstyleInfographicPrompt,
  HAIRSTYLE_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/hairstyle";
import {
  buildColorInfographicPrompt,
  COLOR_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/color";
import {
  buildSpectaclesInfographicPrompt,
  SPECTACLES_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/spectacles";
import {
  buildHairColorInfographicPrompt,
  HAIR_COLOR_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/hair-color";
import { getBlueprintSection } from "@/lib/ai/infographic-sections";

export interface GenerateInfographicInput {
  section: AnalysisInfographicSectionId;
  imageBuffer: Buffer;
  rekognition?: unknown;
  faceShape?: FaceShapeResult;
  features?: FeatureBreakdown;
  hairstyle?: HairstyleResult;
  glasses?: GlassesResult;
  colorAnalysis?: ColorAnalysisResult;
  skinAnalysis?: SkinAnalysisResult;
  quality?: "low" | "medium" | "high";
}

export interface GenerateInfographicResult {
  buffer: Buffer;
  mime: "image/png" | "image/jpeg";
  promptVersion: string;
  width: number;
  height: number;
}

async function prepareInfographicInput(
  buffer: Buffer,
  rekognition: unknown | undefined,
  section: AnalysisInfographicSectionId,
): Promise<Buffer> {
  // Full portrait for clothing/hair/glasses/skin dashboard layouts.
  if (
    section === "hairstyle" ||
    section === "spectacles" ||
    section === "color" ||
    section === "hairColor" ||
    section === "skin"
  ) {
    return buffer;
  }
  const cropped = await cropFaceForInfographic(buffer, rekognition);
  return cropped ?? buffer;
}

export async function generateAnalysisInfographic(
  input: GenerateInfographicInput,
): Promise<GenerateInfographicResult> {
  const meta = getBlueprintSection(input.section);
  if (!meta?.generatable) {
    throw new Error(`Section "${input.section}" is not available yet`);
  }

  const sourceBuffer = await prepareInfographicInput(input.imageBuffer, input.rekognition, input.section);

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
    case "faceFeaturesPreview": {
      if (!input.faceShape) {
        throw new Error("Face shape analysis is required for the preview infographic");
      }
      prompt = buildFaceShapePreviewPrompt(input.faceShape);
      promptVersion = FACE_SHAPE_PREVIEW_PROMPT_VERSION;
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
    case "color": {
      if (!input.colorAnalysis) {
        throw new Error("Color analysis is required for this infographic");
      }
      prompt = buildColorInfographicPrompt(input.colorAnalysis);
      promptVersion = COLOR_PROMPT_VERSION;
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
    case "skin": {
      if (!input.skinAnalysis) {
        throw new Error("Skin analysis is required for this infographic");
      }
      prompt = buildSkinInfographicPrompt(input.skinAnalysis);
      promptVersion = SKIN_PROMPT_VERSION;
      break;
    }
    default:
      throw new Error(`No generator implemented for section "${input.section}"`);
  }

  const generated = await generateGptImageEdit({
    prompt,
    imageBuffer: sourceBuffer,
    quality: input.quality ?? "high",
  });

  const { default: sharp } = await import("sharp");
  const metaImg = await sharp(generated.buffer).metadata();

  return {
    buffer: generated.buffer,
    mime: generated.mime,
    promptVersion,
    width: metaImg.width ?? 0,
    height: metaImg.height ?? 0,
  };
}
