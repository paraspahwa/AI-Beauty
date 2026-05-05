import sharp from "sharp";
import type { ColorAnalysisResult, GlassesResult, HairstyleResult, ReportVisualAssets } from "@/types/report";
import { generateTryOnImage } from "./image-gen";
import { replicateHairPreview, replicateHairPreviewBatch } from "./replicate-hair";
import { replicateClothingPreviewBatch } from "./replicate-clothing";
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

// ── Hair SVG builder — same family paths as HairstyleCard.tsx ────────────────
// Coordinate system: unit (0-100 wide, 0-140 tall) mapped to real pixel coords
// via translate(cx - faceW/2, crownY) scale(faceW/100, faceH*1.3/140)
function buildHairSvg(
  styleName: string,
  box: FaceBox,
  W: number,
  H: number,
  hairHex: string,
): string {
  const s = styleName.toLowerCase();
  const fill = hairHex.startsWith("#") ? hairHex : "#3B1F0A";

  // Convert unit coords → pixel coords
  const sx = box.faceW / 100;
  const sy = (box.faceH * 1.35) / 140;
  const tx = box.cx - box.faceW / 2;
  const ty = box.crownY;

  // opacity chosen so the face remains clearly visible underneath
  const fillA  = `${fill}CC`;  // ~80%
  const sheenA = `${fill}66`;  // ~40%

  let paths: string;

  if (s.includes("long layer") || (s.includes("long") && !s.includes("bob"))) {
    paths = `
      <path d="M34 22 C18 32 8 62 6 95 C4 122 8 140 8 140 L28 140 C26 120 22 98 24 76 C26 56 30 38 36 26 Z" fill="${fillA}"/>
      <path d="M66 22 C82 32 92 62 94 95 C96 122 92 140 92 140 L72 140 C74 120 78 98 76 76 C74 56 70 38 64 26 Z" fill="${fillA}"/>
      <path d="M34 22 C38 12 62 12 66 22 C60 17 40 17 34 22 Z" fill="${fillA}"/>
      <path d="M12 68 C10 82 12 98 14 114" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M88 68 C90 82 88 98 86 114" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("bob") || s.includes("lob")) {
    const cutY = s.includes("lob") ? 90 : 75;
    paths = `
      <path d="M34 22 C18 32 16 55 16 ${cutY} L84 ${cutY} C84 55 82 32 66 22 C60 17 40 17 34 22 Z" fill="${fillA}"/>
      <line x1="16" y1="${cutY}" x2="84" y2="${cutY}" stroke="${sheenA}" stroke-width="2"/>
      <path d="M24 28 L20 ${cutY - 5}" stroke="${sheenA}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("bang") || s.includes("fringe") || s.includes("curtain")) {
    paths = `
      <path d="M34 22 C16 36 10 72 8 112 L24 116 C22 80 26 54 32 34 Z" fill="${fillA}"/>
      <path d="M66 22 C84 36 90 72 92 112 L76 116 C78 80 74 54 68 34 Z" fill="${fillA}"/>
      <path d="M32 22 C38 12 62 12 68 22 C58 18 42 20 36 26 C30 28 32 26 32 22 Z" fill="${fillA}"/>
      <path d="M34 20 C44 24 56 22 66 18" stroke="${sheenA}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("updo") || s.includes("bun") || s.includes("pony")) {
    paths = `
      <path d="M34 28 C26 22 28 14 38 12 L50 10 L62 12 C72 14 74 22 66 28 C60 20 40 20 34 28 Z" fill="${fillA}"/>
      <path d="M34 30 C28 38 30 48 32 54" stroke="${fill}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M66 30 C72 38 70 48 68 54" stroke="${fill}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M50 8 C56 4 64 16 58 48 C54 70 52 92 54 122" stroke="${fill}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("wavy") || s.includes("wave") || s.includes("side part")) {
    paths = `
      <path d="M34 22 C12 36 6 64 8 88 C10 106 6 120 8 140 L24 140 C22 122 26 108 24 90 C22 68 24 48 34 30 Z" fill="${fillA}"/>
      <path d="M66 22 C88 36 94 64 92 88 C90 106 94 120 92 140 L76 140 C78 122 74 108 76 90 C78 68 76 48 66 30 Z" fill="${fillA}"/>
      <path d="M34 22 C40 12 60 12 66 22 C60 17 40 17 34 22 Z" fill="${fillA}"/>
      <path d="M10 56 C8 66 14 74 10 84 C6 94 12 102 10 112" stroke="${sheenA}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M90 56 C92 66 86 74 90 84 C94 94 88 102 90 112" stroke="${sheenA}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("curl") || s.includes("coil") || s.includes("afro")) {
    paths = `
      <path d="M50 2 C18 0 2 18 2 40 C2 60 14 70 22 68 C16 80 10 96 12 124 L30 128 C26 106 28 88 30 72 L30 68 C20 60 14 52 14 40 C14 22 28 12 50 10 C72 12 86 22 86 40 C86 52 80 60 70 68 L70 72 C72 88 74 106 70 128 L88 124 C90 96 84 80 78 68 C86 70 98 60 98 40 C98 18 82 0 50 2 Z" fill="${fillA}"/>
      <path d="M18 28 C14 34 18 42 24 38" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M82 28 C86 34 82 42 76 38" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("pixie") || (s.includes("short") && !s.includes("bob"))) {
    paths = `
      <path d="M34 28 C22 36 20 48 22 60 L78 60 C80 48 78 36 66 28 C60 22 40 22 34 28 Z" fill="${fillA}"/>
      <path d="M38 24 C42 16 50 13 58 16 L62 22" stroke="${fill}" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M24 36 C22 44 22 52 24 58" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M76 36 C78 44 78 52 76 58" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (s.includes("straight") || s.includes("sleek") || s.includes("heavy straight")) {
    paths = `
      <path d="M34 22 C18 36 16 62 14 92 C12 118 16 134 16 140 L30 140 C28 132 24 112 26 88 C28 62 30 40 36 28 Z" fill="${fillA}"/>
      <path d="M66 22 C82 36 84 62 86 92 C88 118 84 134 84 140 L70 140 C72 132 76 112 74 88 C72 62 70 40 64 28 Z" fill="${fillA}"/>
      <path d="M34 22 C40 12 60 12 66 22 C60 17 40 17 34 22 Z" fill="${fillA}"/>
      <path d="M40 18 L30 140" stroke="rgba(255,230,180,0.45)" stroke-width="5" stroke-linecap="round"/>`;
  } else if (s.includes("textured") || s.includes("shag")) {
    paths = `
      <path d="M34 24 C14 38 10 68 10 96 C10 118 14 134 14 140 L28 140 C26 130 22 114 22 94 C22 70 24 46 32 30 Z" fill="${fillA}"/>
      <path d="M66 24 C86 38 90 68 90 96 C90 118 86 134 86 140 L72 140 C74 130 78 114 78 94 C78 70 76 46 68 30 Z" fill="${fillA}"/>
      <path d="M34 24 C40 12 60 12 66 24 C60 18 40 18 34 24 Z" fill="${fillA}"/>
      <path d="M12 66 C16 62 20 68 24 64 C28 60 32 66 36 62" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M88 66 C84 62 80 68 76 64 C72 60 68 66 64 62" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else {
    // Default medium wave (face-framing layers, soft layers, etc.)
    paths = `
      <path d="M34 24 C16 38 14 66 14 100 L28 104 C24 76 24 52 32 32 Z" fill="${fillA}"/>
      <path d="M66 24 C84 38 86 66 86 100 L72 104 C76 76 76 52 68 32 Z" fill="${fillA}"/>
      <path d="M34 24 C40 14 60 14 66 24 C60 18 40 18 34 24 Z" fill="${fillA}"/>
      <path d="M16 55 C14 66 18 76 14 86" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M84 55 C86 66 82 76 86 86" stroke="${sheenA}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  }

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${tx}, ${ty}) scale(${sx}, ${sy})">
      ${paths}
    </g>
  </svg>`;
}

// ── Phase-2 hair-region erase mask ────────────────────────────────────────────
// Paints a soft feathered ellipse over the original hair region using Sharp's
// composite, desaturating the hair area so the new style colour reads cleanly.
async function buildHairEraseMask(box: FaceBox, W: number, H: number): Promise<Buffer> {
  const hairTop    = Math.max(0, box.crownY - box.faceH * 0.05);
  const hairBottom = box.top + box.faceH * 0.05; // just below hairline
  const hairH      = Math.max(1, hairBottom - hairTop);
  const hairW      = Math.round(box.faceW * 1.6);
  const hairCx     = Math.round(box.cx);
  const hairCy     = Math.round(hairTop + hairH / 2);
  const rx         = Math.round(hairW / 2);
  const ry         = Math.round(hairH / 2 + 4);

  // Semi-transparent dark fill with soft edge blurs out the original hair
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hg" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#1C0E04" stop-opacity="0.72"/>
        <stop offset="75%"  stop-color="#1C0E04" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#1C0E04" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${hairCx}" cy="${hairCy}" rx="${rx}" ry="${ry}" fill="url(#hg)"/>
  </svg>`;
  return Buffer.from(svg);
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
 * Generate photoreal glasses try-on images for ALL recommended styles.
 *
 * Pipeline: Replicate SDXL inpainting with an eye-zone mask (identical pattern
 * to replicate-hair.ts and replicate-clothing.ts).
 *
 * - Slots 0–4: flattering styles (top 5 from glasses.recommended)
 * - Falls back gracefully per-slot; failures are logged, not thrown.
 * - When Replicate is not configured the array is empty and SpectaclesCard
 *   falls back to its FrameIllustration SVG overlays automatically.
 */
export async function generateGlassesPreviews(
  selfieBuf: Buffer,
  glasses: GlassesResult,
  rekognitionFace?: unknown,
): Promise<{ index: number; buffer: Buffer }[]> {
  const topStyles   = glasses.recommended.slice(0, 5);
  const img         = sharp(selfieBuf).rotate();
  const meta        = await img.metadata();
  const W           = meta.width  ?? 512;
  const H           = meta.height ?? 768;
  const faceBox     = getFaceBox(rekognitionFace, W, H);
  const replicateToken = env.replicate.apiToken;

  // ── Replicate SDXL inpainting (preferred path) ─────────────────────────
  if (env.replicate.isConfigured && faceBox) {
    const batchStyles = topStyles.map((s, i) => ({ index: i, name: s.style }));
    const replicateResults = await replicateGlassesPreviewBatch(
      selfieBuf,
      faceBox,
      batchStyles,
      replicateToken,
    ).catch((err) => {
      console.warn("[visuals] glasses Replicate batch failed:", (err as Error).message);
      return [] as { index: number; buffer: Buffer; style: string }[];
    });
    return replicateResults.map(({ index, buffer }) => ({ index, buffer }));
  }

  // ── Replicate not configured: return empty; card uses SVG fallbacks ─────
  console.warn("[visuals] Replicate not configured — glasses previews skipped");
  return [];
}

/**
 * Generate per-style hair composite previews for all flattering + avoid styles.
 *
 * Phase 1: Crop user's photo to tight face region → composite per-style hair SVG
 *          at exact Rekognition face pixel coordinates → blend: over.
 * Phase 2: Before compositing, paint a feathered erase ellipse over the original
 *          hair area (radial gradient, dark fill) so the new SVG style reads clearly.
 *
 * Returns up to 8 entries: indices 0-4 = flattering styles, 5-7 = avoid styles.
 * Falls back to DALL-E try-on for the first 2 styles when Rekognition data is missing.
 */
export async function generateHairstylePreviews(
  selfieBuf: Buffer,
  hairstyle: HairstyleResult,
  rekognitionFace?: unknown,
): Promise<{ index: number; buffer: Buffer; style: string }[]> {
  const flatteningStyles = hairstyle.styles.slice(0, 5);
  const avoidStyles      = hairstyle.avoid.slice(0, 4).map((a) => ({ name: a, description: a }));
  const allStyles        = [...flatteningStyles, ...avoidStyles];
  const hairHex          = hairstyle.colors[0]?.hex ?? "#3B1F0A";

  const img  = sharp(selfieBuf).rotate();
  const meta = await img.metadata();
  const W    = meta.width  ?? 512;
  const H    = meta.height ?? 768;

  const faceBox = getFaceBox(rekognitionFace, W, H);

  const results: { index: number; buffer: Buffer; style: string }[] = [];

  const replicateToken = env.replicate.apiToken;
  const useReplicate   = env.replicate.isConfigured && !!faceBox;

  // ── Tier 1: Replicate SDXL batch (photorealistic, parallel) ───────────────
  if (useReplicate && faceBox) {
    const batchStyles = allStyles.map((s, i) => ({ index: i, name: s.name }));
    const replicateResults = await replicateHairPreviewBatch(
      selfieBuf,
      faceBox,
      batchStyles,
      hairHex,
      replicateToken,
    ).catch((err) => {
      console.warn("[visuals] Replicate batch failed, falling back to Sharp:", (err as Error).message);
      return [] as { index: number; buffer: Buffer; style: string }[];
    });

    // Fill in Sharp fallback for any slots Replicate didn't produce
    const replicateDone = new Set(replicateResults.map((r) => r.index));
    results.push(...replicateResults);

    for (let i = 0; i < allStyles.length; i++) {
      if (replicateDone.has(i)) continue;
      const style = allStyles[i];
      try {
        if (faceBox) {
          const eraseMask = await buildHairEraseMask(faceBox, W, H);
          const hairSvg   = buildHairSvg(style.name, faceBox, W, H, hairHex);
          const padX  = Math.round(faceBox.faceW * 0.45);
          const padY  = Math.round(faceBox.faceH * 0.55);
          const cropL = Math.max(0, Math.round(faceBox.left   - padX));
          const cropT = Math.max(0, Math.round(faceBox.crownY - padY * 0.35));
          const cropR = Math.min(W, Math.round(faceBox.right  + padX));
          const cropB = Math.min(H, Math.round(faceBox.bottom + padY * 0.45));
          const composited = await sharp(selfieBuf)
            .rotate()
            .composite([
              { input: eraseMask,            blend: "over", top: 0, left: 0 },
              { input: Buffer.from(hairSvg), blend: "over", top: 0, left: 0 },
            ])
            .extract({ left: cropL, top: cropT, width: cropR - cropL, height: cropB - cropT })
            .resize(400, 530, { fit: "cover", position: "top" })
            .jpeg({ quality: 88 })
            .toBuffer();
          results.push({ index: i, buffer: composited, style: style.name });
        }
      } catch (err) {
        console.warn(`[visuals] Sharp fallback ${i} (${style.name}) failed:`, (err as Error).message);
      }
    }
    return results;
  }

  // ── No Replicate: Sharp SVG composite for all slots ────────────────────────
  for (let i = 0; i < allStyles.length; i++) {
    const style = allStyles[i];
    try {
      // ── Tier 2: Sharp SVG composite (fast, no API cost) ──────────────────
      if (faceBox) {
        // Phase 2: feathered erase mask over original hair zone
        const eraseMask = await buildHairEraseMask(faceBox, W, H);
        // Phase 1: per-style SVG hair silhouette at real face pixel coords
        const hairSvg   = buildHairSvg(style.name, faceBox, W, H, hairHex);

        const padX  = Math.round(faceBox.faceW * 0.45);
        const padY  = Math.round(faceBox.faceH * 0.55);
        const cropL = Math.max(0, Math.round(faceBox.left   - padX));
        const cropT = Math.max(0, Math.round(faceBox.crownY - padY * 0.35));
        const cropR = Math.min(W, Math.round(faceBox.right  + padX));
        const cropB = Math.min(H, Math.round(faceBox.bottom + padY * 0.45));

        const composited = await sharp(selfieBuf)
          .rotate()
          .composite([
            { input: eraseMask,            blend: "over", top: 0, left: 0 },
            { input: Buffer.from(hairSvg), blend: "over", top: 0, left: 0 },
          ])
          .extract({ left: cropL, top: cropT, width: cropR - cropL, height: cropB - cropT })
          .resize(400, 530, { fit: "cover", position: "top" })
          .jpeg({ quality: 88 })
          .toBuffer();

        results.push({ index: i, buffer: composited, style: style.name });
        continue;
      }

      // ── Tier 3: DALL-E edit (no face data, first 2 slots only) ───────────
      if (i < 2) {
        const buf = await generateTryOnImage(
          selfieBuf,
          `${style.name} — ${style.description}`,
          "hairstyle",
        );
        results.push({ index: i, buffer: buf, style: style.name });
      }
    } catch (err) {
      console.warn(`[visuals] hairstyle preview ${i} (${style.name}) failed:`, (err as Error).message);
    }
  }

  return results;
}

/**
 * Generate per-colour clothing try-on previews for the 6 best season colours.
 *
 * Tier 1: Replicate SDXL inpainting (face-box required, photorealistic)
 * Tier 2: CSS overlay only — no server-side image generated (caller falls back
 *          to the existing CSS clip-path overlay in ColorSwatch)
 *
 * Returns up to 6 entries (indices 0-5 = bestColors[0-5]).
 * Always returns the subset that succeeded; missing slots keep CSS fallback.
 */
export async function generateColorSwatchPreviews(
  selfieBuf: Buffer,
  colorAnalysis: ColorAnalysisResult,
  rekognitionFace?: unknown,
): Promise<{ index: number; buffer: Buffer; colorName: string }[]> {
  // We only inpaint the 6 "best" colours — avoid colours use the CSS fallback
  // to keep cost reasonable (6 Replicate calls vs 12).
  const bestSix = colorAnalysis.palette.slice(0, 6);

  const img  = sharp(selfieBuf).rotate();
  const meta = await img.metadata();
  const W    = meta.width  ?? 512;
  const H    = meta.height ?? 768;

  const faceBox = getFaceBox(rekognitionFace, W, H);

  const replicateToken = env.replicate.apiToken;
  const useReplicate   = env.replicate.isConfigured && !!faceBox;

  if (!useReplicate || !faceBox) {
    // No Replicate configured or no face data — caller uses CSS overlay fallback
    console.info("[visuals] colorSwatchPreviews: Replicate unavailable, skipping (CSS fallback active)");
    return [];
  }

  const batchColors = bestSix.map((c, i) => ({ index: i, name: c.name, hex: c.hex }));

  const results = await replicateClothingPreviewBatch(
    selfieBuf,
    faceBox,
    batchColors,
    replicateToken,
  ).catch((err) => {
    console.warn("[visuals] colorSwatchPreviews batch failed:", (err as Error).message);
    return [] as { index: number; buffer: Buffer; colorName: string }[];
  });

  return results;
}
