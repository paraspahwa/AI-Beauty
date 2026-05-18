import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import Replicate from "replicate";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHANGE_HAIRCUT_MODEL = "flux-kontext-apps/change-haircut" as const;
const FAL_HAIR_MODEL       = "fal-ai/image-apps-v2/hair-change" as const;

// Maps FAL snake_case style values to Replicate's change-haircut enum values.
const REPLICATE_STYLE_MAP: Record<string, string> = {
  "short_hair":       "Straight",
  "medium_long_hair": "Layered",
  "long_hair":        "Straight",
  "curly_hair":       "Curly",
  "wavy_hair":        "Wavy",
  "high_ponytail":    "High Ponytail",
  "bun":              "Messy Bun",
  "bob_cut":          "Bob",
  "pixie_cut":        "Pixie Cut",
  "braids":           "Box Braids",
  "straight_hair":    "Straight",
};

// Maps FAL snake_case color values to Replicate's change-haircut hair_color enum.
// Full supported list: Blonde, Golden Blonde, Honey Blonde, Ash Blonde, Platinum Blonde,
// Strawberry Blonde, Brunette, Black, Jet Black, Blue-Black, Dark Brown, Medium Brown,
// Light Brown, Ash Brown, Chestnut, Caramel, Auburn, Copper, Red, Mahogany, Burgundy,
// Silver, White, Titanium, Rose Gold, Blue, Purple, Pink, Green
const HAIR_COLOR_ENUM_MAP: Record<string, string> = {
  "blonde":            "Blonde",
  "golden blonde":     "Golden Blonde",
  "honey blonde":      "Honey Blonde",
  "ash blonde":        "Ash Blonde",
  "platinum blonde":   "Platinum Blonde",
  "strawberry blonde": "Strawberry Blonde",
  "brunette":          "Brunette",
  "black":             "Black",
  "jet black":         "Jet Black",
  "blue-black":        "Blue-Black",
  "dark brown":        "Dark Brown",
  "medium brown":      "Medium Brown",
  "light brown":       "Light Brown",
  "ash brown":         "Ash Brown",
  "chestnut":          "Chestnut",
  "caramel":           "Caramel",
  "auburn":            "Auburn",
  "copper":            "Copper",
  "red":               "Red",
  "mahogany":          "Mahogany",
  "burgundy":          "Burgundy",
  "silver":            "Silver",
  "white":             "White",
  "titanium":          "Titanium",
  "rose gold":         "Rose Gold",
  "blue":              "Blue",
  "purple":            "Purple",
  "pink":              "Pink",
  "green":             "Green",
};

function mapToHairColorEnum(colorName: string): string {
  // Normalize snake_case to spaces (e.g. "dark_brown" → "dark brown")
  const key = colorName.toLowerCase().trim().replace(/_/g, " ");
  if (HAIR_COLOR_ENUM_MAP[key]) return HAIR_COLOR_ENUM_MAP[key];
  // Partial match — e.g. "warm auburn" → "Auburn"
  for (const [k, v] of Object.entries(HAIR_COLOR_ENUM_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // Fallback: capitalise and pass as-is (model may still handle it)
  return colorName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * POST /api/reports/[id]/hair-color
 * Body: { colorName: string; colorHex: string }
 *
 * Generates a try-on image with the user's selfie recolored to the selected hair color.
 * Returns a signed URL valid for 1 hour.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      colorName?: string;
      colorHex?: string;
      styleName?: string;
      sourceAssetId?: string;
    };
    const colorName = (body.colorName ?? "").trim().slice(0, 60).replace(/[^\x20-\x7E]/g, "");
    const styleName = (body.styleName ?? "").trim().slice(0, 60).replace(/[^\x20-\x7E_]/g, "");
    const sourceAssetId = normalizeSourceAssetId(body.sourceAssetId);
    if (!colorName) {
      return NextResponse.json({ error: "colorName is required" }, { status: 400 });
    }

    if (!env.fal?.isConfigured && !env.replicate.isConfigured) {
      return NextResponse.json({ error: "No AI service configured" }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    let sourceResolved: { sourceImagePath: string; sourceAssetId: string | null };
    try {
      sourceResolved = await resolveSourceImagePath({
        admin,
        userId: user.id,
        defaultImagePath: row.image_path as string,
        sourceAssetId,
      });
    } catch {
      return NextResponse.json({ error: "Invalid source image selection" }, { status: 400 });
    }

    // ── Entitlement check ─────────────────────────────────────────────────────
    const { data: tierData } = await admin.rpc("get_user_plan_tier", { p_user: user.id });
    const planTier = (tierData as string | null) ?? "free";

    if (planTier === "studio_pro") {
      const allowed = await admin.rpc("try_consume_generation", { p_user: user.id, p_cap: 150 });
      if (!allowed.data) {
        return NextResponse.json(
          { error: "Monthly generation limit reached (150). Resets at the start of next billing period.", code: "QUOTA_EXCEEDED" },
          { status: 429 },
        );
      }
    } else {
      // For report-plan users, require paid report
      const { data: paidCheck } = await admin
        .from("reports")
        .select("is_paid")
        .eq("id", id)
        .single();
      if (!paidCheck?.is_paid) {
        return NextResponse.json({ error: "Payment required" }, { status: 402 });
      }
    }

    // Download selfie
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(sourceResolved.sourceImagePath);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const rawBuf = Buffer.from(await imgData.arrayBuffer());

    // Phase 2.4: Build storage path early so we can cache-check before calling the model
    const sourceKey = sourceResolved.sourceAssetId ? sourceResolved.sourceAssetId.slice(0, 8) : "orig";
    const slug = `${styleName ? styleName + "-" : ""}${colorName}-${sourceKey}`
      .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "").slice(0, 80);
    const storagePath = `users/${user.id}/reports/${id}/hair-color-${slug}.jpg`;

    // Cache hit: return existing signed URL without calling Replicate
    const { data: existingFile } = await admin.storage
      .from(env.supabase.bucket)
      .download(storagePath);
    if (existingFile) {
      const { data: cached } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(storagePath, 3600);
      if (cached?.signedUrl) {
        const { data: existingAsset } = await admin
          .from("generated_assets")
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("result_image_path", storagePath)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return NextResponse.json({
          signedUrl: cached.signedUrl,
          cached: true,
          asset: existingAsset
            ? { id: existingAsset.id as string, createdAt: existingAsset.created_at as string }
            : null,
        });
      }
    }

    // Downscale to 640px for faster upload + processing
    const { default: sharp } = await import("sharp");

    const smallBuf = await sharp(rawBuf)
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;

    const hairColorEnum = mapToHairColorEnum(colorName);
    console.info(`[hair-color] style="${styleName || 'No change'}" color="${colorName}" => enum "${hairColorEnum}"`);

    let url: string | null = null;

    // Option 1: fal-ai/image-apps-v2/hair-change (when FAL_KEY configured)
    if (env.fal?.isConfigured) {
      try {
        const { createFalClient } = await import("@fal-ai/client");
        const fal = createFalClient({ credentials: env.fal.apiKey });
        const falInput: Record<string, unknown> = { image_url: imageDataUri };
        // FAL uses snake_case style values directly (e.g. "bob_cut", "curly_hair")
        if (styleName && styleName !== "No change") falInput["hair_style"] = styleName;
        // FAL uses snake_case color values directly (e.g. "auburn", "dark_brown")
        if (colorName && colorName !== "natural") falInput["hair_color"] = colorName;
        // @ts-expect-error -- dynamic Record into strict generic
        const result = await fal.run(FAL_HAIR_MODEL, { input: falInput }) as { data?: { images?: { url?: string }[] }; image?: { url?: string }; images?: { url?: string }[]; url?: string };
        const raw = result?.data?.images?.[0]?.url ?? result?.image?.url ?? result?.images?.[0]?.url ?? result?.url;
        if (raw?.startsWith("https://")) {
          url = raw;
          console.info(`[hair-color] FAL OK for "${slug}"`);
        }
      } catch (err) {
        console.warn(`[hair-color] FAL failed, falling back to Replicate: ${(err as Error).message}`);
      }
    }

    // Option 2: flux-kontext-apps/change-haircut (Replicate fallback)
    if (!url) {
      if (!env.replicate.isConfigured) {
        return NextResponse.json({ error: "No AI service configured" }, { status: 503 });
      }
      const replicate = new Replicate({ auth: env.replicate.apiToken, useFileOutput: false });
      // Map FAL snake_case style values to Replicate's enum (e.g. "bob_cut" → "Bob")
      const replicateStyle = styleName && styleName !== "No change"
        ? (REPLICATE_STYLE_MAP[styleName] ?? styleName)
        : "No change";
      const output = await replicate.run(CHANGE_HAIRCUT_MODEL, {
        input: {
          input_image:      imageDataUri,
          haircut:          replicateStyle,
          hair_color:       hairColorEnum,
          gender:           "none",
          aspect_ratio:     "match_input_image",
          output_format:    "jpg",
          safety_tolerance: 2,
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) url = raw;
    }

    if (!url) return NextResponse.json({ error: "Generation failed" }, { status: 502 });

    // Download result from Replicate — 30 s timeout to avoid indefinite hangs
    const dlController = new AbortController();
    const dlTimeout = setTimeout(() => dlController.abort(), 30_000);
    let resultRes: Response;
    try {
      resultRes = await fetch(url, { signal: dlController.signal });
    } finally {
      clearTimeout(dlTimeout);
    }
    if (!resultRes.ok) return NextResponse.json({ error: "Failed to download generated image" }, { status: 502 });
    const resultBuf = Buffer.from(await resultRes.arrayBuffer());

    // Resize output to a consistent preview size
    const finalBuf = await sharp(resultBuf)
      .resize(400, 530, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();

    const { error: uploadErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(storagePath, finalBuf, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    // Return a signed URL (1 hour)
    const { data: signed } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(storagePath, 3600);

    let asset: { id: string; createdAt: string } | null = null;
    try {
      asset = await insertGeneratedAsset({
        admin,
        userId: user.id,
        reportId: id,
        sourceAssetId: sourceResolved.sourceAssetId,
        sourceImagePath: sourceResolved.sourceImagePath,
        resultImagePath: storagePath,
        tool: "hair",
        variant: slug,
        meta: {
          colorName,
          styleName: styleName || "No change",
        },
      });
    } catch (insertErr) {
      console.warn("[hair-color] failed to persist generated_assets row:", (insertErr as Error).message);
    }

    return NextResponse.json({ signedUrl: signed?.signedUrl ?? null, asset });
  } catch (err) {
    console.error("[hair-color] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
