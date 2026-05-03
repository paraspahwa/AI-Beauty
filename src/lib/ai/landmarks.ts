/**
 * landmarks.ts
 *
 * Converts AWS Rekognition FaceDetail.Landmarks into the 6 pointer-dot
 * positions used by FaceFeaturesCard.
 *
 * Rekognition landmark X/Y are fractions 0-1 of the FULL image dimensions.
 * We output them in the same 0-1 space; the component converts to SVG coords.
 *
 * Rekognition landmark types used:
 *   leftEyeBrowLeft, leftEyeBrowRight, rightEyeBrowLeft, rightEyeBrowRight
 *   eyeLeft, eyeRight
 *   nose
 *   leftCheek, rightCheek
 *   mouthLeft, mouthRight
 *   (BoundingBox for face-shape temple point)
 */

/** A single dot position in 0-1 image fraction space. */
export interface LandmarkPoint {
  x: number; // 0 = left edge, 1 = right edge
  y: number; // 0 = top edge, 1 = bottom edge
}

/** The 6 dots we need for FaceFeaturesCard pointer lines. */
export interface FaceLandmarks {
  /** Left side of face (links to Face Shape box on the left panel) */
  faceShape: LandmarkPoint;
  /** Left eye centre (links to Eyes box on the left panel) */
  eyes: LandmarkPoint;
  /** Nose tip (links to Nose box on the left panel) */
  nose: LandmarkPoint;
  /** Right eyebrow (links to Eyebrows box on the right panel) */
  eyebrows: LandmarkPoint;
  /** Right cheek (links to Cheeks box on the right panel) */
  cheeks: LandmarkPoint;
  /** Right mouth corner (links to Lips box on the right panel) */
  lips: LandmarkPoint;
}

// ── Types matching what AWS SDK returns (kept minimal to avoid import issues) ──
interface RekLandmark {
  Type?: string;
  X?: number;
  Y?: number;
}
interface RekBoundingBox {
  Left?: number;
  Top?: number;
  Width?: number;
  Height?: number;
}
interface RekFaceDetail {
  Landmarks?: RekLandmark[];
  BoundingBox?: RekBoundingBox;
}

function avg(...pts: (LandmarkPoint | undefined)[]): LandmarkPoint | undefined {
  const valid = pts.filter((p): p is LandmarkPoint => p !== undefined);
  if (valid.length === 0) return undefined;
  return {
    x: valid.reduce((s, p) => s + p.x, 0) / valid.length,
    y: valid.reduce((s, p) => s + p.y, 0) / valid.length,
  };
}

/**
 * Extract FaceLandmarks from a Rekognition FaceDetail object.
 * Returns null if the input is not a valid FaceDetail or lacks landmark data.
 */
export function extractFaceLandmarks(faceDetail: unknown): FaceLandmarks | null {
  if (!faceDetail || typeof faceDetail !== "object") return null;

  const detail = faceDetail as RekFaceDetail;
  const lms = detail.Landmarks ?? [];
  const bb  = detail.BoundingBox;

  if (lms.length === 0 && !bb) return null;

  // Build a quick lookup map: type → {x, y}
  const map: Record<string, LandmarkPoint> = {};
  for (const lm of lms) {
    if (lm.Type && lm.X !== undefined && lm.Y !== undefined) {
      map[lm.Type] = { x: lm.X, y: lm.Y };
    }
  }

  // ── 1. Face Shape dot — left temple / outer left eyebrow ─────────────────
  // Use leftEyeBrowLeft (outermost left brow point) as the temple landmark.
  // Fallback: left edge of bounding box at mid-forehead height.
  const faceShape: LandmarkPoint =
    map["leftEyeBrowLeft"] ??
    map["leftEyeBrowUp"] ??
    (bb
      ? { x: (bb.Left ?? 0.2), y: (bb.Top ?? 0.25) + (bb.Height ?? 0.5) * 0.25 }
      : { x: 0.28, y: 0.28 });

  // ── 2. Eyes dot — left eye centre ────────────────────────────────────────
  const eyes: LandmarkPoint =
    map["eyeLeft"] ??
    avg(map["leftEyeLeft"], map["leftEyeRight"]) ??
    { x: 0.37, y: 0.42 };

  // ── 3. Nose dot — nose tip ────────────────────────────────────────────────
  const nose: LandmarkPoint =
    map["nose"] ??
    map["noseTip"] ??
    map["noseLeft"] ??          // fallback to left nostril
    { x: 0.50, y: 0.60 };

  // ── 4. Eyebrows dot — right eyebrow (exits to right panel) ───────────────
  const eyebrows: LandmarkPoint =
    map["rightEyeBrowRight"] ??
    map["rightEyeBrowUp"] ??
    avg(map["rightEyeBrowLeft"], map["rightEyeBrowRight"]) ??
    { x: 0.65, y: 0.28 };

  // ── 5. Cheeks dot — right cheek ───────────────────────────────────────────
  const cheeks: LandmarkPoint =
    map["rightCheek"] ??
    avg(map["eyeRight"], map["mouthRight"]) ??
    { x: 0.68, y: 0.55 };

  // ── 6. Lips dot — right mouth corner ─────────────────────────────────────
  const lips: LandmarkPoint =
    map["mouthRight"] ??
    avg(map["mouthLeft"], map["mouthRight"]) ??
    map["mouth"] ??
    { x: 0.60, y: 0.72 };

  return { faceShape, eyes, nose, eyebrows, cheeks, lips };
}
