import sharp from "sharp";
import type { ColorAnalysisResult, GlassesResult, HairstyleResult, ReportVisualAssets } from "@/types/report";
import { generateTryOnImage } from "./image-gen";

type LandmarkPoint = {
  Type?: string;
  X?: number;
  Y?: number;
};

type FaceLike = {
  Landmarks?: LandmarkPoint[];
};

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
 * Generate photoreal glasses try-on images for the top 2 recommended styles.
 * Failures are caught per-slot so one bad generation never blocks the rest.
 */
export async function generateGlassesPreviews(
  selfieBuf: Buffer,
  glasses: GlassesResult,
): Promise<{ index: number; buffer: Buffer }[]> {
  const topStyles = glasses.recommended.slice(0, 2);
  const results: { index: number; buffer: Buffer }[] = [];
  for (let i = 0; i < topStyles.length; i++) {
    try {
      const buf = await generateTryOnImage(
        selfieBuf,
        `${topStyles[i].style} frames`,
        "glasses",
      );
      results.push({ index: i, buffer: buf });
    } catch (err) {
      console.warn(`[visuals] glasses preview ${i} failed:`, (err as Error).message);
    }
  }
  return results;
}

/**
 * Generate photoreal hairstyle try-on images for the top 2 recommended styles.
 */
export async function generateHairstylePreviews(
  selfieBuf: Buffer,
  hairstyle: HairstyleResult,
): Promise<{ index: number; buffer: Buffer }[]> {
  const topStyles = hairstyle.styles.slice(0, 2);
  const results: { index: number; buffer: Buffer }[] = [];
  for (let i = 0; i < topStyles.length; i++) {
    try {
      const buf = await generateTryOnImage(
        selfieBuf,
        `${topStyles[i].name} — ${topStyles[i].description}`,
        "hairstyle",
      );
      results.push({ index: i, buffer: buf });
    } catch (err) {
      console.warn(`[visuals] hairstyle preview ${i} failed:`, (err as Error).message);
    }
  }
  return results;
}
