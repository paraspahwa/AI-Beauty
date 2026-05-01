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
