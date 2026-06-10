import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { fetchAmazonProductImages } from "@/lib/amazon-pa-api";
import { env } from "@/lib/env";

export const runtime    = "nodejs";
export const maxDuration = 15;

/** Valid ASIN: exactly 10 uppercase alphanumeric characters */
const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * POST /api/affiliate/amazon-images
 * Body: { asins: string[] }
 *
 * Returns: { images: Record<asin, imageUrl | null> }
 *
 * Requires auth. Gracefully returns {} when PA-API is not configured.
 * In-process cache (24 h TTL) avoids hitting PA-API on every page load.
 */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── PA-API configured? ────────────────────────────────────────────────────
  if (!env.amazon.paApiConfigured) {
    // Return empty gracefully — the UI falls back to the icon
    return NextResponse.json({ images: {} });
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { asins?: unknown }).asins)) {
    return NextResponse.json({ error: "asins array required" }, { status: 400 });
  }

  const raw = (body as { asins: unknown[] }).asins;

  // Sanitise: only valid ASINs, max 20 per call
  const asins = raw
    .filter((a): a is string => typeof a === "string" && ASIN_RE.test(a))
    .slice(0, 20);

  if (asins.length === 0) {
    return NextResponse.json({ images: {} });
  }

  // ── Fetch from PA-API (with in-process cache) ─────────────────────────────
  const results = await fetchAmazonProductImages(asins, {
    accessKeyId: env.amazon.paApiAccessKeyId,
    secretKey:   env.amazon.paApiSecretKey,
    partnerTag:  env.amazon.partnerTag,
  });

  const images: Record<string, string | null> = {};
  for (const [asin, data] of results) {
    images[asin] = data.imageUrl;
  }

  return NextResponse.json({ images });
}
