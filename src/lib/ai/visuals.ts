import sharp from "sharp";
import type { ColorAnalysisResult, GlassesResult, HairstyleResult, ReportVisualAssets } from "@/types/report";
import { replicateHairPreviewBatch } from "./replicate-hair";
import { replicateGlassesPreviewBatch } from "./replicate-glasses";
import { env } from "@/lib/env";

type LandmarkPoint = {
  Type?: string;
  X?: number;
  Y?: number;
};

type FaceLike = {
  BoundingBox?: { Left?: number; Top?: number; Width?: number; Height?: number };
  Landmarks?: LandmarkPoint[];
};

// ── Face bounding box extraction ─────────────────────────────────────────────
interface FaceBox { left: number; top: number; right: number; bottom: number; cx: number; crownY: number; faceW: number; faceH: number }

export function getFaceBox(face: unknown, W: number, H: number): FaceBox | null {
  if (!face || typeof face !== "object") return null;
  const f = face as FaceLike;
  const bb = f.BoundingBox;
  if (!bb || typeof bb.Left !== "number") return null;
  const left   = bb.Left   * W;
  const top    = bb.Top    !== undefined ? bb.Top    * H : 0;
  const right  = left + (bb.Width  !== undefined ? bb.Width  * W : 0);
  const bottom = top  + (bb.Height !== undefined ? bb.Height * H : 0);
  const faceW  = right - left;
  const faceH  = bottom - top;
  // crown sits ~15% above the Rekognition top (forehead not included in BB)
  const crownY = Math.max(0, top - faceH * 0.15);
  return { left, top, right, bottom, cx: (left + right) / 2, crownY, faceW, faceH };
}


function esc(text: string): string {
  return text.replace(/[<>&"']/g, (char) => {
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "&") return "&amp;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function getLandmarks(face: unknown): LandmarkPoint[] {
  if (!face || typeof face !== "object") return [];
  const maybeFace = face as FaceLike;
  if (!Array.isArray(maybeFace.Landmarks)) return [];
  return maybeFace.Landmarks.filter((point) => (
    typeof point?.X === "number" && typeof point?.Y === "number"
  ));
}

export async function generateLandmarkOverlay(
  rawImage: Buffer,
  face: unknown,
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const landmarks = getLandmarks(face);
  if (landmarks.length === 0) return null;

  const img = sharp(rawImage).rotate();
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return null;

  const highlighted = new Set([
    "leftEyeLeft",
    "leftEyeRight",
    "rightEyeLeft",
    "rightEyeRight",
    "nose",
    "mouthLeft",
    "mouthRight",
  ]);

  const circles = landmarks.map((point) => {
    const px = Math.round((point.X ?? 0) * width);
    const py = Math.round((point.Y ?? 0) * height);
    const key = point.Type ?? "";
    const isHighlight = highlighted.has(key);
    const radius = isHighlight ? 6 : 3;
    const fill = isHighlight ? "#F4C995" : "#FFF2D8";
    const opacity = isHighlight ? 0.95 : 0.65;
    return `<circle cx="${px}" cy="${py}" r="${radius}" fill="${fill}" fill-opacity="${opacity}"/>`;
  }).join("\n");

  const labels = landmarks
    .filter((point) => highlighted.has(point.Type ?? ""))
    .map((point) => {
      const px = Math.round((point.X ?? 0) * width) + 8;
      const py = Math.round((point.Y ?? 0) * height) - 8;
      return `<text x="${px}" y="${py}" font-size="16" fill="#F4EAD8">${esc(point.Type ?? "point")}</text>`;
    })
    .join("\n");

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#0A0A0F" fill-opacity="0.18"/>
    ${circles}
    ${labels}
  </svg>`;

  const out = await img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { buffer: out, width, height };
}

export async function generatePaletteBoard(
  analysis: ColorAnalysisResult,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const width = 1200;
  const height = 800;
  const cols = 4;
  const rows = 2;
  const cardWidth = 250;
  const cardHeight = 250;
  const xStart = 70;
  const yStart = 230;
  const xGap = 20;
  const yGap = 20;

  const cards = analysis.palette.slice(0, 8).map((color, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = xStart + col * (cardWidth + xGap);
    const y = yStart + row * (cardHeight + yGap);

    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="22" fill="#14141D" stroke="#2D2A36"/>
        <rect x="${x + 18}" y="${y + 18}" width="${cardWidth - 36}" height="${cardHeight - 90}" rx="16" fill="${esc(color.hex)}"/>
        <text x="${x + 18}" y="${y + cardHeight - 44}" font-size="22" fill="#F1E8DA">${esc(color.name)}</text>
        <text x="${x + 18}" y="${y + cardHeight - 18}" font-size="16" fill="#B8AD99">${esc(color.hex)}</text>
      </g>`;
  }).join("\n");

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F1018"/>
        <stop offset="100%" stop-color="#1B1D28"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)"/>
    <text x="70" y="85" font-size="46" fill="#F4E9D8">Your Color Palette</text>
    <text x="70" y="130" font-size="24" fill="#C9B99E">${esc(analysis.season)} · ${esc(analysis.undertone)} undertone</text>
    ${cards}
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return { buffer, width, height };
}

export function createVisualAssetsSkeleton(userId: string, reportId: string, bucket: string): ReportVisualAssets {
  const basePath = `${userId}/${reportId}/visuals/v1/`;
  return {
    version: 1,
    bucket,
    basePath,
    assets: {
      landmarkOverlay: {
        path: `${basePath}landmarks-overlay.png`,
        status: "missing",
        mime: "image/png",
        error: null,
      },
      paletteBoard: {
        path: `${basePath}palette-board.png`,
        status: "missing",
        mime: "image/png",
        error: null,
      },
    },
  };
}

/**
 * Generate photoreal glasses try-on images for top 3 recommended styles.
 * Uses Flux Kontext Fast — no mask or faceBox required.
 * Falls back to empty array when Replicate is not configured; SpectaclesCard
 * then uses its built-in FrameIllustration SVG fallbacks.
 */
export async function generateGlassesPreviews(
  selfieBuf: Buffer,
  glasses: GlassesResult,
  _rekognitionFace?: unknown,
  /** If provided, only generate previews for these slot indices (Phase 5.4 per-click). */
  indicesToGenerate?: number[],
): Promise<{ index: number; buffer: Buffer }[]> {
  const topStyles = glasses.recommended.slice(0, 3);

  if (env.replicate.isConfigured) {
    const batchStyles = topStyles
      .map((s, i) => ({ index: i, name: s.style }))
      .filter((s) => !indicesToGenerate || indicesToGenerate.includes(s.index));
    if (batchStyles.length === 0) return [];
    const results = await replicateGlassesPreviewBatch(
      selfieBuf,
      null,
      batchStyles,
      env.replicate.apiToken,
    ).catch((err) => {
      console.warn("[visuals] glasses Replicate batch failed:", (err as Error).message);
      return [] as { index: number; buffer: Buffer; style: string }[];
    });
    return results.map(({ index, buffer }) => ({ index, buffer }));
  }

  console.warn("[visuals] Replicate not configured — glasses previews skipped");
  return [];
}

/**
 * Generate photorealistic hairstyle try-on previews for top 3 flattering styles.
 * Uses Flux Kontext Fast — no mask or faceBox required.
 * Falls back to empty array when Replicate is not configured; HairstyleCard
 * uses its built-in HairOverlay SVG fallbacks.
 */
export async function generateHairstylePreviews(
  selfieBuf: Buffer,
  hairstyle: HairstyleResult,
  _rekognitionFace?: unknown,
  /** If provided, only generate previews for these slot indices (Phase 5.4 per-click). */
  indicesToGenerate?: number[],
): Promise<{ index: number; buffer: Buffer; style: string }[]> {
  const flatteningStyles = hairstyle.styles.slice(0, 3);
  const hairHex          = hairstyle.colors[0]?.hex ?? "#3B1F0A";

  if (env.replicate.isConfigured) {
    const batchStyles = flatteningStyles
      .map((s, i) => ({ index: i, name: s.name }))
      .filter((s) => !indicesToGenerate || indicesToGenerate.includes(s.index));
    if (batchStyles.length === 0) return [];
    return replicateHairPreviewBatch(
      selfieBuf,
      null,
      batchStyles,
      hairHex,
      env.replicate.apiToken,
    ).catch((err) => {
      console.warn("[visuals] hair Replicate batch failed:", (err as Error).message);
      return [] as { index: number; buffer: Buffer; style: string }[];
    });
  }

  console.warn("[visuals] Replicate not configured — hairstyle previews skipped");
  return [];
}

/**
 * Generate per-colour clothing try-on previews.
 * @deprecated Use generateAllColorSwatchPreviews from color-swatch-v2.ts instead.
 * This stub is kept only so existing callers that import this name don't break at
 * compile time — it always returns an empty array.
 */
export async function generateColorSwatchPreviews(
  _selfieBuf: Buffer,
  _colorAnalysis: ColorAnalysisResult,
  _rekognitionFace?: unknown,
): Promise<{ index: number; buffer: Buffer; colorName: string }[]> {
  return [];
}
