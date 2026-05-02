export const FACE_SHAPE_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Returns whether it is safe to apply shape-conditioned styling prompts.
 */
export function shouldUseShapeConditioning(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= FACE_SHAPE_CONFIDENCE_THRESHOLD;
}

/**
 * Generic fallback label used when face-shape confidence is below threshold.
 */
export const GENERIC_FACE_SHAPE_LABEL = "Balanced";

/**
 * P1-2: Blend GPT face-shape confidence with Rekognition detection confidence.
 *
 * Rekognition reports how certain it is that a real face was detected (0–100).
 * We normalise it to 0–1 and blend it with the GPT model's self-reported
 * confidence using a weighted average (GPT carries more weight because it
 * directly classifies shape; Rekognition only tells us the face is real).
 *
 * Weights:
 *   - GPT self-reported confidence: 70%
 *   - Rekognition face detection confidence (normalised): 30%
 *
 * If Rekognition data is unavailable the function returns the raw GPT confidence.
 */
export function blendConfidence(
  gptConfidence: number,
  rekognitionFace: unknown,
): number {
  const gpt = Number.isFinite(gptConfidence) ? Math.max(0, Math.min(1, gptConfidence)) : 0;

  // Extract Rekognition top-level face detection confidence (0–100 scale)
  let rekNorm = 1.0; // assume maximum when data is absent
  if (
    rekognitionFace &&
    typeof rekognitionFace === "object" &&
    "Confidence" in rekognitionFace &&
    typeof (rekognitionFace as Record<string, unknown>).Confidence === "number"
  ) {
    const raw = (rekognitionFace as Record<string, unknown>).Confidence as number;
    rekNorm = Math.max(0, Math.min(1, raw / 100));
  }

  return 0.7 * gpt + 0.3 * rekNorm;
}
