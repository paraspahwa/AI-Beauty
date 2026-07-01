import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { hasPremiumAccess } from "@/lib/auth/access";
import { env } from "@/lib/env";
import Replicate from "replicate";
import { isHairStyleAllowedForGender, normalizeRekognitionGender } from "@/lib/hair-options";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";
import { isReportSelfiePath } from "@/lib/vault/vault-item-id";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHANGE_HAIRCUT_MODEL = "flux-kontext-apps/change-haircut" as const;
const FAL_HAIR_MODEL = "fal-ai/image-apps-v2/hair-change" as const;

const REPLICATE_STYLE_MAP: Record<string, string> = {
  short_hair: "Straight",
  medium_long_hair: "Layered",
  long_hair: "Straight",
  curly_hair: "Curly",
  wavy_hair: "Wavy",
  high_ponytail: "High Ponytail",
  bun: "Messy Bun",
  bob_cut: "Bob",
  pixie_cut: "Pixie Cut",
  braids: "Box Braids",
  straight_hair: "Straight",
};

const HAIR_COLOR_ENUM_MAP: Record<string, string> = {
  blonde: "Blonde",
  "golden blonde": "Golden Blonde",
  "honey blonde": "Honey Blonde",
  "ash blonde": "Ash Blonde",
  "platinum blonde": "Platinum Blonde",
  "strawberry blonde": "Strawberry Blonde",
  brunette: "Brunette",
  black: "Black",
  "jet black": "Jet Black",
  "blue-black": "Blue-Black",
  "dark brown": "Dark Brown",
  "medium brown": "Medium Brown",
  "light brown": "Light Brown",
  "ash brown": "Ash Brown",
  chestnut: "Chestnut",
  caramel: "Caramel",
  auburn: "Auburn",
  copper: "Copper",
  red: "Red",
  mahogany: "Mahogany",
  burgundy: "Burgundy",
  silver: "Silver",
  white: "White",
  titanium: "Titanium",
  "rose gold": "Rose Gold",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
  green: "Green",
};

function mapToHairColorEnum(colorName: string): string {
  const key = colorName.toLowerCase().trim().replace(/_/g, " ");
  if (HAIR_COLOR_ENUM_MAP[key]) return HAIR_COLOR_ENUM_MAP[key];
  for (const [k, v] of Object.entries(HAIR_COLOR_ENUM_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return colorName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * POST /api/reports/[id]/hair-color
 * Body: { colorName: string; styleName?: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { colorName?: string; styleName?: string };
    const colorName = (body.colorName ?? "").trim().slice(0, 60).replace(/[^\x20-\x7E]/g, "");
    const styleName = (body.styleName ?? "").trim().slice(0, 60).replace(/[^\x20-\x7E_]/g, "");
    if (!colorName) {
      return NextResponse.json({ error: "colorName is required" }, { status: 400 });
    }

    if (!env.fal?.isConfigured && !env.replicate.isConfigured) {
      return NextResponse.json({ error: "No AI service configured" }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, rekognition, is_paid")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
    if (!hasPremium) {
      return NextResponse.json({ error: "Report not unlocked" }, { status: 402 });
    }
    if (!isReportSelfiePath(row.image_path, user.id, row.id)) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
    }

    const detectedGender = normalizeRekognitionGender(row.rekognition);
    if (styleName && styleName !== "No change" && !isHairStyleAllowedForGender(styleName, detectedGender)) {
      return NextResponse.json(
        { error: `Selected hairstyle is not available for detected gender (${detectedGender}).` },
        { status: 400 },
      );
    }

    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const rawBuf = Buffer.from(await imgData.arrayBuffer());

    const slug = `${styleName ? styleName + "-" : ""}${colorName}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 80);
    const lowResPath = `users/${user.id}/reports/${id}/hair-color-${slug}-low.jpg`;
    const hdResPath = `users/${user.id}/reports/${id}/hair-color-${slug}-hd.jpg`;

    const { data: existingFile } = await admin.storage.from(env.supabase.bucket).download(hdResPath);
    if (existingFile) {
      const [{ data: signedLow }, { data: signedHd }] = await Promise.all([
        admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600),
        admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath, 3600),
      ]);
      return NextResponse.json({
        lowResUrl: signedLow?.signedUrl ?? null,
        hdUrl: signedHd?.signedUrl ?? null,
        cached: true,
      });
    }

    const { default: sharp } = await import("sharp");
    const smallBuf = await sharp(rawBuf)
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
    const hairColorEnum = mapToHairColorEnum(colorName);

    let url: string | null = null;

    if (env.fal?.isConfigured) {
      try {
        const { createFalClient } = await import("@fal-ai/client");
        const fal = createFalClient({ credentials: env.fal.apiKey });
        const falInput: Record<string, unknown> = { image_url: imageDataUri };
        if (styleName && styleName !== "No change") falInput.hair_style = styleName;
        if (colorName && colorName !== "natural") falInput.hair_color = colorName;
        // @ts-expect-error dynamic input
        const result = (await fal.run(FAL_HAIR_MODEL, { input: falInput })) as {
          data?: { images?: { url?: string }[] };
          image?: { url?: string };
          images?: { url?: string }[];
          url?: string;
        };
        const raw =
          result?.data?.images?.[0]?.url ??
          result?.image?.url ??
          result?.images?.[0]?.url ??
          result?.url;
        if (raw?.startsWith("https://")) url = raw;
      } catch (err) {
        console.warn(`[hair-color] FAL failed: ${(err as Error).message}`);
      }
    }

    if (!url) {
      if (!env.replicate.isConfigured) {
        return NextResponse.json({ error: "No AI service configured" }, { status: 503 });
      }
      const replicate = new Replicate({ auth: env.replicate.apiToken, useFileOutput: false });
      const replicateStyle =
        styleName && styleName !== "No change"
          ? (REPLICATE_STYLE_MAP[styleName] ?? styleName)
          : "No change";
      const output = await replicate.run(CHANGE_HAIRCUT_MODEL, {
        input: {
          input_image: imageDataUri,
          haircut: replicateStyle,
          hair_color: hairColorEnum,
          gender: detectedGender,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) url = raw;
    }

    if (!url) return NextResponse.json({ error: "Generation failed" }, { status: 502 });

    let resultBuf: Buffer;
    try {
      resultBuf = await fetchRemoteImageBuffer(url, { timeoutMs: 30_000, maxBytes: 20 * 1024 * 1024 });
    } catch {
      return NextResponse.json({ error: "Failed to download generated image" }, { status: 502 });
    }

    const lowRes = await sharp(resultBuf)
      .resize(400, 530, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();
    const hdRes = await sharp(resultBuf)
      .resize(1024, 1356, { fit: "cover", position: "top" })
      .jpeg({ quality: 98 })
      .toBuffer();

    await admin.storage
      .from(env.supabase.bucket)
      .upload(lowResPath, lowRes, { contentType: "image/jpeg", upsert: true });
    await admin.storage
      .from(env.supabase.bucket)
      .upload(hdResPath, hdRes, { contentType: "image/jpeg", upsert: true });

    const [{ data: signedLow }, { data: signedHd }] = await Promise.all([
      admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600),
      admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath, 3600),
    ]);

    return NextResponse.json({
      lowResUrl: signedLow?.signedUrl ?? null,
      hdUrl: signedHd?.signedUrl ?? null,
    });
  } catch (err) {
    console.error("[hair-color] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
