import type { FaceShapeResult } from "@/types/report";

export const FACE_SHAPE_PREVIEW_PROMPT_VERSION = "face_shape_preview_v1";

export function buildFaceShapePreviewPrompt(faceShape: FaceShapeResult): string {
  const traits = faceShape.traits.slice(0, 5);

  return [
    "Transform the uploaded portrait into a premium facial features analysis infographic preview.",
    "",
    "DESIGN STYLE",
    "- Premium beauty consultation report",
    "- Soft beige background (#F5F0EA), ivory, cream, warm neutral palette",
    "- Elegant serif title typography",
    "- Minimalist magazine-quality infographic",
    "- Clean spacing, professional visual hierarchy",
    "",
    'TITLE: "Face Features Analysis"',
    "",
    "MAIN LAYOUT",
    "- Portrait centered; preserve the person's identity exactly",
    "- ONE analysis panel only: FACE SHAPE on the left side",
    "- Elegant callout line from portrait to the face shape panel",
    "- Subtle white connector line and anchor point",
    "- Small footer text at bottom: \"Unlock your full report for eyes, nose, lips & more\"",
    "",
    "FACE SHAPE PANEL",
    "- Face shape icon",
    "- Face shape name",
    "- Key characteristics as bullet points",
    "",
    "Do NOT include eyes, nose, eyebrows, cheeks, or lips panels.",
    "",
    "OUTPUT: Vertical 4:5 aspect ratio, ultra-high resolution, print-ready.",
    "",
    "=== AUTHORITATIVE FACE SHAPE DATA (use verbatim — do not contradict) ===",
    `Face shape: ${faceShape.shape}`,
    traits.length ? `Characteristics: ${traits.join("; ")}` : "",
    traits.map((t) => `- ${t}`).join("\n"),
    "",
    "CRITICAL: Preserve identity exactly. Use only the face shape data above for panel text.",
  ]
    .filter(Boolean)
    .join("\n");
}
