import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { ColorAnalysisResult, SkinAnalysisResult, FaceShapeResult, HairstyleResult } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CapsuleItem {
  number: number;
  category: "Base" | "Colour" | "Neutral" | "Pattern" | "Evening" | "Occasion";
  name: string;
  why: string;
  hex: string;
  fabric?: string;
  myntraQuery?: string;
  amazonQuery?: string;
}

export interface GeneratedCapsule {
  season: string;
  undertone: string;
  items: CapsuleItem[];
  generatedAt: string;
  /** Signed URL for the AI-generated hero flat-lay image (paid users only). */
  heroImageUrl?: string;
}

// ── Colour distance helper (avoid-color guard) ─────────────────────────────────
const HEX_RE = /^#[0-9a-f]{6}$/i;
function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function colourDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
function isTooCloseToAvoid(hex: string, avoidColors: { hex: string }[]): boolean {
  return avoidColors.some((a) => colourDistance(hex, a.hex) < 55);
}

// ── Fabric recommendation by skin type ────────────────────────────────────────
function fabricNote(skinType: string | null): string {
  switch (skinType?.toLowerCase()) {
    case "oily":       return "Prioritise breathable natural fabrics: cotton, linen, bamboo jersey.";
    case "dry":        return "Choose moisture-retaining fabrics: satin, velvet, silk, cashmere.";
    case "sensitive":  return "Stick to hypoallergenic natural fibres: organic cotton, bamboo, silk. Avoid synthetic finishes.";
    case "combination": return "Mix breathable (cotton, linen) for tops near the face; richer textures (viscose, chiffon) for lower body.";
    default:           return "Choose fabrics that feel comfortable and suit the occasion.";
  }
}

// ── Prompt builder ─────────────────────────────────────────────────────────────
function buildCapsulePrompt(
  colorAnalysis: ColorAnalysisResult,
  skinAnalysis: SkinAnalysisResult | null,
  faceShape: FaceShapeResult | null,
  hairstyle: HairstyleResult | null,
): string {
  const metals = colorAnalysis.metals.join(", ");
  const palette = colorAnalysis.palette.map((c) => `${c.name} (${c.hex})`).join(", ");
  const avoid = colorAnalysis.avoidColors.map((c) => `${c.name} (${c.hex})`).join(", ");
  const skinNote = skinAnalysis ? `Skin type: ${skinAnalysis.type}. Concerns: ${skinAnalysis.concerns.join(", ")}.` : "";
  const faceNote = faceShape ? `Face shape: ${faceShape.shape}.` : "";
  const hairNote = hairstyle?.colors[0] ? `Hair color direction: ${hairstyle.colors[0].name}.` : "";
  const fabricGuide = skinAnalysis ? `Fabric guide for their skin: ${fabricNote(skinAnalysis.type)}` : "";

  return `You are a world-class personal stylist creating a bespoke 10-piece seasonal wardrobe capsule.

USER PROFILE:
- Color season: ${colorAnalysis.season}
- Undertone: ${colorAnalysis.undertone}
- Best palette colors: ${palette}
- Best metals: ${metals}
- Colors to AVOID (never use these): ${avoid}
- ${skinNote}
- ${faceNote}
- ${hairNote}
- ${fabricGuide}

TASK: Create exactly 10 wardrobe capsule items personalized for this user.

RULES:
1. Every item's hex color MUST come from the user's palette or be a season-appropriate variation — NEVER from their avoid list.
2. Mention the user's specific colors, metals, or skin type in each "why" explanation (make it feel personal, not generic).
3. Include items suitable for the Indian market (include kurtas, sarees, anarkalis where appropriate for Colour/Evening categories).
4. Balance the categories: 2-3 Base, 2-3 Colour, 1-2 Neutral, 1 Pattern, 1-2 Evening/Occasion.
5. Each "fabric" field should match the user's skin type (${skinAnalysis?.type ?? "Normal"}).
6. myntraQuery and amazonQuery should be short search terms that will find the item on those platforms.

Return a JSON object with an "items" key containing an array of exactly 10 items (no markdown, no prose):
{"items": [
  {
    "number": 1,
    "category": "Base" | "Colour" | "Neutral" | "Pattern" | "Evening" | "Occasion",
    "name": "short item name (3-5 words)",
    "why": "2 sentences: why this item specifically suits THIS user's season/undertone/skin. Use their specific colors and metals.",
    "hex": "#rrggbb",
    "fabric": "specific fabric recommendation for their skin type",
    "myntraQuery": "search term for Myntra",
    "amazonQuery": "search term for Amazon India"
  },
  ...
]}`
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    // Check cache — return existing capsule if generated within the last 30 days
    const { data: prefsRow } = await admin
      .from("user_style_prefs")
      .select("prefs, color_season, undertone, skin_type")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingCapsule = (prefsRow?.prefs as Record<string, unknown> | null)?.generatedCapsule as GeneratedCapsule | undefined;
    const body = await req.json().catch(() => ({})) as { force?: boolean };

    if (!body.force && existingCapsule?.generatedAt) {
      const age = Date.now() - new Date(existingCapsule.generatedAt).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (age < thirtyDays) {
        return NextResponse.json({ capsule: existingCapsule, cached: true });
      }
    }

    // Load latest ready report for full profile
    const { data: reportRow } = await admin
      .from("reports")
      .select("color_analysis, skin_analysis, face_shape, hairstyle, rekognition, is_paid")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const colorAnalysis = (reportRow?.color_analysis ?? null) as ColorAnalysisResult | null;
    const skinAnalysis  = (reportRow?.skin_analysis  ?? null) as SkinAnalysisResult  | null;
    const faceShape     = (reportRow?.face_shape     ?? null) as FaceShapeResult     | null;
    const hairstyle     = (reportRow?.hairstyle      ?? null) as HairstyleResult     | null;
    const isPaid        = !!reportRow?.is_paid;

    if (!colorAnalysis) {
      return NextResponse.json({ error: "No color analysis found. Complete a report first." }, { status: 422 });
    }

    // Generate via OpenAI
    const openai = new OpenAI({ apiKey: env.openai.apiKey });
    const completion = await openai.chat.completions.create({
      model: env.openai.miniModel,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a world-class personal stylist. Respond ONLY with valid JSON — no markdown, no prose, no code fences. Return a JSON object with an \"items\" array.",
        },
        {
          role: "user",
          content: buildCapsulePrompt(colorAnalysis, skinAnalysis, faceShape, hairstyle),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let items: CapsuleItem[];
    try {
      const parsed = JSON.parse(raw) as unknown;
      // response_format: json_object wraps in an object — accept either { items: [...] } or a bare array
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "items" in (parsed as Record<string, unknown>)) {
        items = (parsed as { items: CapsuleItem[] }).items;
      } else if (Array.isArray(parsed)) {
        items = parsed as CapsuleItem[];
      } else {
        throw new Error("Unexpected shape");
      }
      if (!Array.isArray(items) || items.length === 0) throw new Error("Empty array");
    } catch {
      console.error("[capsule] Failed to parse AI response:", raw.slice(0, 200));
      return NextResponse.json({ error: "Generation failed — please try again." }, { status: 502 });
    }

    // Sanitize text fields to prevent storing adversarially long strings from AI response
    const MAX_NAME = 80, MAX_WHY = 400, MAX_FABRIC = 120, MAX_QUERY = 120;
    items = items.map((item) => ({
      ...item,
      name:        String(item.name        ?? "").slice(0, MAX_NAME),
      why:         String(item.why         ?? "").slice(0, MAX_WHY),
      fabric:      item.fabric      != null ? String(item.fabric).slice(0, MAX_FABRIC)       : undefined,
      myntraQuery: item.myntraQuery != null ? String(item.myntraQuery).slice(0, MAX_QUERY)   : undefined,
      amazonQuery: item.amazonQuery != null ? String(item.amazonQuery).slice(0, MAX_QUERY)   : undefined,
    }));

    // Avoid-color guard: replace any flagged or malformed hex with a safe palette fallback
    const safeHexes = colorAnalysis.palette.map((c) => c.hex);
    items = items.map((item, i) => {
      const fallback = safeHexes[i % safeHexes.length] ?? "#9C7D5B";
      if (!isValidHex(item.hex)) {
        console.warn(`[capsule] item "${item.name}" has invalid hex "${item.hex}" — replacing with ${fallback}`);
        return { ...item, hex: fallback };
      }
      if (isTooCloseToAvoid(item.hex, colorAnalysis.avoidColors)) {
        console.warn(`[capsule] item "${item.name}" hex ${item.hex} too close to avoid color — replacing with ${fallback}`);
        return { ...item, hex: fallback };
      }
      return item;
    });

    // Renumber to ensure 1-10
    items = items.slice(0, 10).map((item, i) => ({ ...item, number: i + 1 }));

    const capsule: GeneratedCapsule = {
      season: colorAnalysis.season,
      undertone: colorAnalysis.undertone,
      items,
      generatedAt: new Date().toISOString(),
    };

    // ── Hero image for paid users ─────────────────────────────────────────────
    if (isPaid && env.replicate.isConfigured) {
      try {
        const { generateCapsuleHeroImage } = await import("@/lib/ai/seedream-capsule");
        const heroBuffer = await generateCapsuleHeroImage(capsule, env.replicate.apiToken);
        if (heroBuffer) {
          const heroPath = `users/${user.id}/capsule/hero-${Date.now()}.jpg`;
          const { error: upErr } = await admin.storage
            .from(env.supabase.bucket)
            .upload(heroPath, heroBuffer, { contentType: "image/jpeg", upsert: true });
          if (!upErr) {
            const { data: signed } = await admin.storage
              .from(env.supabase.bucket)
              .createSignedUrl(heroPath, 30 * 24 * 60 * 60); // 30 days, matches cache TTL
            if (signed?.signedUrl) {
              capsule.heroImageUrl = signed.signedUrl;
            }
          }
        }
      } catch (heroErr) {
        // Non-fatal: capsule still returns without hero image
        console.warn("[capsule] hero image generation failed:", (heroErr as Error).message);
      }
    }

    // Cache in user_style_prefs.prefs JSONB column
    const existingPrefs = (prefsRow?.prefs as Record<string, unknown> | null) ?? {};
    await admin
      .from("user_style_prefs")
      .upsert(
        {
          user_id: user.id,
          color_season: colorAnalysis.season,
          undertone: colorAnalysis.undertone,
          skin_type: skinAnalysis?.type ?? prefsRow?.skin_type ?? null,
          prefs: { ...existingPrefs, generatedCapsule: capsule },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    return NextResponse.json({ capsule, cached: false });
  } catch (err) {
    console.error("[capsule/generate] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET: return cached capsule ─────────────────────────────────────────────────
export async function GET() {
  try {
    env.assertServer();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: prefsRow } = await admin
      .from("user_style_prefs")
      .select("prefs")
      .eq("user_id", user.id)
      .maybeSingle();

    const capsule = (prefsRow?.prefs as Record<string, unknown> | null)?.generatedCapsule as GeneratedCapsule | null;
    return NextResponse.json({ capsule: capsule ?? null });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
