import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OutfitOccasion = "casual" | "work" | "date" | "wedding" | "travel";
type OutfitVibe = "minimal" | "classic" | "bold" | "romantic" | "street";

type PaletteColor = { name: string; hex: string };
type OutfitLook = {
  title: string;
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
  pieces: string[];
  accentColors: PaletteColor[];
  metal: string;
  whyItWorks: string;
};

type OutfitFeedback = {
  liked: boolean;
  saved: boolean;
  worn: boolean;
};

type OutfitSession = {
  id: string;
  createdAt: string;
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
  season: string;
  undertone: string;
  looks: OutfitLook[];
  feedback?: OutfitFeedback;
};

function pickColors(palette: PaletteColor[], start: number): PaletteColor[] {
  if (palette.length === 0) {
    return [
      { name: "Soft Rose", hex: "#111827" },
      { name: "Powder Blush", hex: "#fffafc" },
      { name: "Plum", hex: "#111827" },
    ];
  }
  const out: PaletteColor[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(palette[(start + i) % palette.length]);
  }
  return out;
}

function piecesFor(occasion: OutfitOccasion, vibe: OutfitVibe, lookIdx: number): string[] {
  const map: Record<OutfitOccasion, Record<OutfitVibe, string[][]>> = {
    casual: {
      minimal: [
        ["Relaxed tee", "Straight denims", "White sneakers", "Structured tote"],
        ["Ribbed tank", "Wide-leg trousers", "Slip-on loafers", "Thin belt"],
        ["Boxy shirt", "Ankle jeans", "Clean trainers", "Mini shoulder bag"],
      ],
      classic: [
        ["Polo knit", "High-waist chinos", "Ballet flats", "Top-handle bag"],
        ["Button-down shirt", "Dark denims", "Loafers", "Silk scarf"],
        ["Fine cardigan", "A-line midi skirt", "Mary Janes", "Structured satchel"],
      ],
      bold: [
        ["Color-block tee", "Cargo pants", "Chunky sneakers", "Statement shades"],
        ["Printed shirt", "Relaxed jeans", "High-top sneakers", "Mini backpack"],
        ["Graphic knit", "Pleated mini", "Ankle boots", "Layered chains"],
      ],
      romantic: [
        ["Soft blouse", "Flowy midi skirt", "Strappy flats", "Pearl clips"],
        ["Puff-sleeve top", "Tailored shorts", "Ballet flats", "Sling bag"],
        ["Lace-trim cami", "Wide denims", "Kitten heels", "Silk scrunchie"],
      ],
      street: [
        ["Oversized hoodie", "Parachute pants", "Chunky sneakers", "Crossbody"],
        ["Utility jacket", "Wide jeans", "Combat boots", "Cap"],
        ["Longline tee", "Track pants", "Skater shoes", "Sling pack"],
      ],
    },
    work: {
      minimal: [
        ["Crisp shirt", "Tailored trousers", "Pointed flats", "Structured tote"],
        ["Sleeveless shell", "Straight slacks", "Loafers", "Slim watch"],
        ["Monochrome knit", "Pencil skirt", "Block heels", "Laptop bag"],
      ],
      classic: [
        ["Blazer", "Silk blouse", "Cigarette pants", "Classic pumps"],
        ["Wrap top", "Pleated midi", "Loafers", "Leather belt"],
        ["Cardigan set", "Tailored skirt", "Slingback heels", "Pearl studs"],
      ],
      bold: [
        ["Power blazer", "Wide-leg trousers", "Heeled mules", "Statement earrings"],
        ["Printed blouse", "Tailored culottes", "Pointed pumps", "Structured bag"],
        ["Color-pop knit", "Slim trousers", "Ankle boots", "Metal cuff"],
      ],
      romantic: [
        ["Ruffle blouse", "Bias midi skirt", "Kitten heels", "Top-handle bag"],
        ["Soft blazer", "Pleated trousers", "Ballet pumps", "Fine necklace"],
        ["Drape top", "A-line skirt", "Strap heels", "Silk scarf"],
      ],
      street: [
        ["Boxy blazer", "Wide trousers", "Clean sneakers", "Messenger bag"],
        ["Cropped jacket", "Straight slacks", "Loafers", "Chain bag"],
        ["Relaxed shirt", "Cargo trousers", "Derby shoes", "Minimal cap"],
      ],
    },
    date: {
      minimal: [
        ["Slip dress", "Light trench", "Strappy heels", "Mini clutch"],
        ["Satin cami", "Tailored pants", "Slingback heels", "Delicate jewelry"],
        ["Fitted knit", "Bias skirt", "Ankle strap heels", "Shoulder bag"],
      ],
      classic: [
        ["Wrap dress", "Pointed pumps", "Small clutch", "Pearl studs"],
        ["Silk blouse", "High-waist skirt", "Ballet heels", "Top-handle bag"],
        ["Tailored blazer", "Slip midi", "Slingbacks", "Fine chain"],
      ],
      bold: [
        ["Statement dress", "Heeled boots", "Metallic clutch", "Bold earrings"],
        ["One-shoulder top", "Leather pants", "Pointed heels", "Cuff bracelet"],
        ["Dramatic blouse", "Mini skirt", "Platform heels", "Layered necklaces"],
      ],
      romantic: [
        ["Floral midi", "Kitten heels", "Pearl bag", "Soft curls"],
        ["Lace blouse", "Flowy skirt", "Ballet heels", "Rose-gold accents"],
        ["Ruffle dress", "Slingbacks", "Mini clutch", "Drop earrings"],
      ],
      street: [
        ["Corset top", "Wide denims", "Heeled boots", "Crossbody"],
        ["Moto jacket", "Mini skirt", "Chunky boots", "Statement chain"],
        ["Mesh top", "Cargo mini", "Platform sneakers", "Mini bag"],
      ],
    },
    wedding: {
      minimal: [
        ["Solid saree", "Architectural blouse", "Heels", "Structured clutch"],
        ["Monotone lehenga", "Modern dupatta drape", "Heels", "Studs"],
        ["Clean kurta set", "Minimal jewelry", "Mojari", "Potli bag"],
      ],
      classic: [
        ["Silk saree", "Traditional blouse", "Jhumkas", "Heirloom clutch"],
        ["Embroidered lehenga", "Classic dupatta", "Heels", "Kundan set"],
        ["Anarkali set", "Statement earrings", "Juttis", "Potli"],
      ],
      bold: [
        ["High-contrast lehenga", "Cape dupatta", "Metal heels", "Statement choker"],
        ["Dramatic saree drape", "Corset blouse", "Heels", "Layered jewelry"],
        ["Fusion gown", "Bold earrings", "Clutch", "Embellished sandals"],
      ],
      romantic: [
        ["Pastel lehenga", "Soft dupatta", "Heels", "Pearl jewelry"],
        ["Floral saree", "Delicate blouse", "Bangles", "Mini clutch"],
        ["Flowy anarkali", "Rose-gold accents", "Juttis", "Potli"],
      ],
      street: [
        ["Pre-draped saree", "Cropped jacket", "Chunky heels", "Mini bag"],
        ["Lehenga with shirt blouse", "Boots", "Chain jewelry", "Box clutch"],
        ["Kurta with wide pants", "Statement sneakers", "Crossbody", "Hoops"],
      ],
    },
    travel: {
      minimal: [
        ["Breathable tee", "Linen pants", "Walking sneakers", "Tote"],
        ["Light shirt", "Comfort denims", "Slip-ons", "Crossbody"],
        ["Knit top", "Relaxed trousers", "Trainers", "Cap"],
      ],
      classic: [
        ["Striped shirt", "Tailored shorts", "Loafers", "Structured tote"],
        ["Polo knit", "Straight denims", "Comfort flats", "Sling bag"],
        ["Cardigan", "Midi skirt", "Sneakers", "Scarf"],
      ],
      bold: [
        ["Printed co-ord", "Chunky sneakers", "Crossbody", "Statement shades"],
        ["Color-pop jacket", "Cargo pants", "Boots", "Bucket hat"],
        ["Graphic set", "High-top sneakers", "Mini backpack", "Hoops"],
      ],
      romantic: [
        ["Flowy dress", "Flat sandals", "Woven tote", "Hair scarf"],
        ["Soft blouse", "Wide pants", "Ballet flats", "Mini bag"],
        ["Cami", "Midi skirt", "Comfort sandals", "Pearl clips"],
      ],
      street: [
        ["Overshirt", "Parachute pants", "Chunky sneakers", "Sling bag"],
        ["Hoodie", "Wide denims", "Combat boots", "Cap"],
        ["Crop jacket", "Track pants", "Skaters", "Backpack"],
      ],
    },
  };

  return map[occasion][vibe][lookIdx] ?? map.casual.minimal[0];
}

function buildLooks(input: {
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
  season: string;
  undertone: string;
  palette: PaletteColor[];
  metals: string[];
}): OutfitLook[] {
  const looks: OutfitLook[] = [];
  const metal = input.metals[0] ?? (input.undertone === "Warm" ? "Gold" : "Silver");

  for (let i = 0; i < 3; i++) {
    const colors = pickColors(input.palette, i * 2);
    looks.push({
      title: `${input.vibe[0].toUpperCase()}${input.vibe.slice(1)} ${input.occasion} look ${i + 1}`,
      occasion: input.occasion,
      vibe: input.vibe,
      pieces: piecesFor(input.occasion, input.vibe, i),
      accentColors: colors,
      metal,
      whyItWorks: `Built around your ${input.season} palette with ${input.undertone.toLowerCase()} harmony and ${metal.toLowerCase()} accessories for coherence.`,
    });
  }

  return looks;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      occasion?: OutfitOccasion;
      vibe?: OutfitVibe;
    };

    const allowedOccasions: OutfitOccasion[] = ["casual", "work", "date", "wedding", "travel"];
    const allowedVibes: OutfitVibe[] = ["minimal", "classic", "bold", "romantic", "street"];

    const occasion = allowedOccasions.includes(body.occasion as OutfitOccasion)
      ? (body.occasion as OutfitOccasion)
      : "casual";
    const vibe = allowedVibes.includes(body.vibe as OutfitVibe)
      ? (body.vibe as OutfitVibe)
      : "minimal";

    const admin = createSupabaseAdminClient();

    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, is_paid, color_analysis, visual_assets")
      .eq("id", id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    const { data: tierData } = await admin.rpc("get_user_plan_tier", { p_user: user.id });
    const planTier = (tierData as string | null) ?? "free";
    if (planTier !== "studio_pro" && !row.is_paid) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }

    const colorAnalysis = (row.color_analysis as {
      season?: string;
      undertone?: string;
      palette?: PaletteColor[];
      metals?: string[];
    } | null) ?? null;

    const season = colorAnalysis?.season ?? "Soft Autumn";
    const undertone = colorAnalysis?.undertone ?? "Neutral";
    const palette = (colorAnalysis?.palette ?? []).slice(0, 8);
    const metals = (colorAnalysis?.metals ?? []).slice(0, 3);

    const looks = buildLooks({
      occasion,
      vibe,
      season,
      undertone,
      palette,
      metals,
    });

    const createdAt = new Date().toISOString();
    const session: OutfitSession = {
      id: crypto.randomUUID(),
      createdAt,
      occasion,
      vibe,
      season,
      undertone,
      looks,
      feedback: { liked: false, saved: false, worn: false },
    };

    const visualAssets = (row.visual_assets as Record<string, unknown> | null) ?? {};
    const existingHistory = Array.isArray(visualAssets.outfitGeneratorHistory)
      ? (visualAssets.outfitGeneratorHistory as OutfitSession[])
      : [];
    const history = [session, ...existingHistory].slice(0, 20);

    await admin
      .from("reports")
      .update({
        visual_assets: {
          ...visualAssets,
          outfitGeneratorLatest: session,
          outfitGeneratorHistory: history,
        },
      })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({
      looks,
      session,
      history,
      meta: { season, undertone, generatedAt: createdAt },
    });
  } catch (err) {
    console.error("[outfit-generator route]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, visual_assets")
      .eq("id", id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const visualAssets = (row.visual_assets as Record<string, unknown> | null) ?? {};
    const history = Array.isArray(visualAssets.outfitGeneratorHistory)
      ? (visualAssets.outfitGeneratorHistory as OutfitSession[])
      : [];

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[outfit-generator route GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      sessionId?: string;
      field?: keyof OutfitFeedback;
      value?: boolean;
    };

    const sessionId = (body.sessionId ?? "").trim();
    const field = body.field;
    if (!sessionId || !field || !["liked", "saved", "worn"].includes(field)) {
      return NextResponse.json({ error: "sessionId and valid field are required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, visual_assets")
      .eq("id", id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const visualAssets = (row.visual_assets as Record<string, unknown> | null) ?? {};
    const history = Array.isArray(visualAssets.outfitGeneratorHistory)
      ? (visualAssets.outfitGeneratorHistory as OutfitSession[])
      : [];

    const idx = history.findIndex((s) => s.id === sessionId);
    if (idx < 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const session = history[idx];
    const currentFeedback: OutfitFeedback = {
      liked: session.feedback?.liked ?? false,
      saved: session.feedback?.saved ?? false,
      worn: session.feedback?.worn ?? false,
    };
    const nextValue = typeof body.value === "boolean" ? body.value : !currentFeedback[field];
    const updatedSession: OutfitSession = {
      ...session,
      feedback: {
        ...currentFeedback,
        [field]: nextValue,
      },
    };

    const nextHistory = [...history];
    nextHistory[idx] = updatedSession;

    const latest = (visualAssets.outfitGeneratorLatest as OutfitSession | undefined) ?? null;
    const nextLatest = latest?.id === sessionId ? updatedSession : latest;

    await admin
      .from("reports")
      .update({
        visual_assets: {
          ...visualAssets,
          outfitGeneratorLatest: nextLatest,
          outfitGeneratorHistory: nextHistory,
        },
      })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ session: updatedSession, history: nextHistory });
  } catch (err) {
    console.error("[outfit-generator route PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
