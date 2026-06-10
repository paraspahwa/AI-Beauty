import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { parseMomentToken } from "@/lib/moment-share";

export const runtime = "nodejs";
export const revalidate = 0;

async function loadImageBuffer(path: string): Promise<Buffer | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(env.supabase.bucket).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const payload = parseMomentToken(token);

  if (!payload) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [beforeBuf, afterBuf] = await Promise.all([
    loadImageBuffer(payload.b),
    loadImageBuffer(payload.a),
  ]);

  if (!beforeBuf || !afterBuf) {
    return new NextResponse("Image unavailable", { status: 404 });
  }

  const { default: sharp } = await import("sharp");

  const panelWidth = 580;
  const panelHeight = 630;
  const width = 1200;
  const height = 630;

  const beforePanel = await sharp(beforeBuf)
    .rotate()
    .resize(panelWidth, panelHeight, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toBuffer();

  const afterPanel = await sharp(afterBuf)
    .rotate()
    .resize(panelWidth, panelHeight, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toBuffer();

  const background = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 253, g: 250, b: 246 },
    },
  })
    .jpeg()
    .toBuffer();

  const labelSvg = (text: string) => Buffer.from(`
    <svg width="${panelWidth}" height="48">
      <rect x="16" y="8" width="${text.length * 9 + 24}" height="32" rx="16" fill="rgba(17,24,39,0.72)" />
      <text x="28" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">${text}</text>
    </svg>
  `);

  const brandSvg = Buffer.from(`
    <svg width="220" height="40">
      <text x="0" y="28" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#111827">Renovaara</text>
    </svg>
  `);

  const composite = await sharp(background)
    .composite([
      { input: beforePanel, left: 10, top: 0 },
      { input: afterPanel, left: 610, top: 0 },
      { input: labelSvg("Before"), left: 10, top: 16 },
      { input: labelSvg("After"), left: 610, top: 16 },
      { input: brandSvg, left: 24, top: height - 52 },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return new NextResponse(new Uint8Array(composite), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
