/**
 * Personalized recommendation memory loop.
 *
 * Two responsibilities:
 *  1. persistStylePrefs() — after a completed analysis, write the derived
 *     preferences (color season, face shape, skin type, undertone) to the
 *     user_style_prefs table via the upsert_style_prefs RPC.
 *
 *  2. buildPersonalizedSystemBase() — before running the next analysis,
 *     fetch the existing prefs and append a short "user context" block
 *     to SYSTEM_BASE so the LLM can produce more consistent results for
 *     repeat users (e.g. same color season confirmed twice = higher weight).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ColorAnalysisResult, FaceShapeResult, SkinAnalysisResult } from "@/types/report";

interface StylePrefs {
  color_season: string | null;
  undertone: string | null;
  face_shape: string | null;
  skin_type: string | null;
  prefs: Record<string, unknown>;
}

/**
 * Persist derived style preferences after a successful analysis.
 * Errors are caught and logged so they never block the analysis response.
 */
export async function persistStylePrefs(
  userId: string,
  faceShape: FaceShapeResult,
  colorAnalysis: ColorAnalysisResult,
  skinAnalysis: SkinAnalysisResult,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc("upsert_style_prefs", {
      p_user_id:      userId,
      p_color_season: colorAnalysis.season ?? null,
      p_undertone:    colorAnalysis.undertone ?? null,
      p_face_shape:   faceShape.shape ?? null,
      p_skin_type:    skinAnalysis.type ?? null,
      p_prefs: {
        metals: colorAnalysis.metals ?? [],
        palette: (colorAnalysis.palette ?? []).slice(0, 3).map((c: { hex: string }) => c.hex),
      },
    });
    if (error) {
      console.warn("[memory] upsert_style_prefs failed:", error.message);
    }
  } catch (err) {
    console.warn("[memory] persistStylePrefs error:", (err as Error).message);
  }
}

/**
 * Fetch stored preferences for a user and return a personalized addendum
 * for SYSTEM_BASE.  Returns an empty string if no prefs exist or on error.
 *
 * The addendum is appended to the default SYSTEM_BASE before any stage
 * prompt to nudge the model toward consistency with past confirmed results.
 */
export async function buildPersonalizedSystemBase(
  userId: string,
  defaultSystemBase: string,
): Promise<string> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("user_style_prefs")
      .select("color_season, undertone, face_shape, skin_type, prefs")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return defaultSystemBase;

    const prefs = data as StylePrefs;
    const lines: string[] = [];

    if (prefs.color_season) lines.push(`Confirmed color season: ${prefs.color_season}.`);
    if (prefs.undertone)    lines.push(`Undertone: ${prefs.undertone}.`);
    if (prefs.face_shape)   lines.push(`Previous face shape classification: ${prefs.face_shape}.`);
    if (prefs.skin_type)    lines.push(`Skin type: ${prefs.skin_type}.`);

    if (lines.length === 0) return defaultSystemBase;

    const personalizedBlock =
      `\n\n--- User's previously confirmed style profile (use as soft prior, may update if photo evidence is strong) ---\n` +
      lines.join("\n") +
      `\n---`;

    return defaultSystemBase + personalizedBlock;
  } catch (err) {
    console.warn("[memory] buildPersonalizedSystemBase error:", (err as Error).message);
    return defaultSystemBase;
  }
}
