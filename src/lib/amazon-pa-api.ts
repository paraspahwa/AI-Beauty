/**
 * Amazon Product Advertising API 5.0 — server-side client.
 *
 * Prerequisites (set in Vercel env vars / .env.local):
 *   AWS_ACCESS_KEY_ID        — IAM key with PA-API access
 *   AWS_SECRET_ACCESS_KEY    — IAM secret with PA-API access
 *   AMAZON_PARTNER_TAG       — Your Associates tag, e.g. "aibeauty-21"
 *
 * PA-API quotas: 1 req/sec, max 10 ASINs per GetItems call.
 * Results are cached in-process for 24 hours to minimise API calls.
 *
 * PA-API access requires your Associates account to have made at least
 * one qualifying sale — new accounts may see AccessDenied until then.
 */

import { createHmac, createHash } from "crypto";

// ── Constants ────────────────────────────────────────────────────────────────

const PA_API_HOST   = "webservices.amazon.in";
const PA_API_REGION = "eu-west-1";
const PA_API_PATH   = "/paapi5/getitems";
const PA_API_TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
const CACHE_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours

// ── In-process cache ─────────────────────────────────────────────────────────

interface CachedEntry {
  imageUrl: string | null;
  expiresAt: number;
}

const _cache = new Map<string, CachedEntry>();

// ── Public types ─────────────────────────────────────────────────────────────

export interface PaApiProductData {
  asin: string;
  imageUrl: string | null;
  title?: string;
  priceAmount?: number;
  priceCurrency?: string;
}

export interface PaApiOpts {
  accessKeyId: string;
  secretKey: string;
  partnerTag: string;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetch product images (and optional price/title) for a list of ASINs.
 * Returns a Map<asin, PaApiProductData>.
 * Gracefully returns partial results on network / auth errors.
 */
export async function fetchAmazonProductImages(
  asins: string[],
  opts: PaApiOpts,
): Promise<Map<string, PaApiProductData>> {
  const result  = new Map<string, PaApiProductData>();
  const now     = Date.now();
  const pending: string[] = [];

  for (const asin of asins) {
    const cached = _cache.get(asin);
    if (cached && cached.expiresAt > now) {
      result.set(asin, { asin, imageUrl: cached.imageUrl });
    } else {
      pending.push(asin);
    }
  }

  if (pending.length === 0) return result;

  // PA-API max 10 items per call
  for (let i = 0; i < pending.length; i += 10) {
    const chunk = pending.slice(i, i + 10);
    try {
      const items = await _callPaApi(chunk, opts);
      for (const item of items) {
        result.set(item.asin, item);
        _cache.set(item.asin, { imageUrl: item.imageUrl, expiresAt: now + CACHE_TTL_MS });
      }
    } catch (err) {
      // Non-fatal: affiliate images are an enhancement, never block the page
      console.warn("[amazon-pa-api] GetItems error:", (err as Error).message);
    }
  }

  return result;
}

// ── PA-API call with AWS SigV4 ───────────────────────────────────────────────

async function _callPaApi(asins: string[], opts: PaApiOpts): Promise<PaApiProductData[]> {
  const { accessKeyId, secretKey, partnerTag } = opts;

  const payload = JSON.stringify({
    ItemIds:     asins,
    Resources:   ["Images.Primary.Medium", "ItemInfo.Title", "Offers.Listings.Price"],
    PartnerTag:  partnerTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.in",
  });

  // AWS SigV4 signing
  const now       = new Date();
  const amzDate   = _isoBasic(now);      // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  const hdrs: Record<string, string> = {
    "content-encoding": "amz-1.0",
    "content-type":     "application/json; charset=utf-8",
    "host":             PA_API_HOST,
    "x-amz-date":       amzDate,
    "x-amz-target":     PA_API_TARGET,
  };

  const sortedKeys     = Object.keys(hdrs).sort();
  const canonicalHdrs  = sortedKeys.map((k) => `${k}:${hdrs[k]}\n`).join("");
  const signedHdrNames = sortedKeys.join(";");
  const bodyHash       = _sha256(payload);

  const canonicalRequest = [
    "POST",
    PA_API_PATH,
    "",                 // no query string
    canonicalHdrs,
    signedHdrNames,
    bodyHash,
  ].join("\n");

  const credScope = `${dateStamp}/${PA_API_REGION}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credScope,
    _sha256(canonicalRequest),
  ].join("\n");

  const signingKey  = _getSigningKey(secretKey, dateStamp, PA_API_REGION, "ProductAdvertisingAPI");
  const signature   = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}`,
    `SignedHeaders=${signedHdrNames}`,
    `Signature=${signature}`,
  ].join(", ");

  const res = await fetch(`https://${PA_API_HOST}${PA_API_PATH}`, {
    method:  "POST",
    headers: { ...hdrs, Authorization: authorization },
    body:    payload,
    // Abort after 8 seconds to avoid Vercel timeout cascades
    signal:  AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PA-API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as _PaApiResponse;

  return (json.ItemsResult?.Items ?? []).map((item) => ({
    asin:          item.ASIN,
    imageUrl:      item.Images?.Primary?.Medium?.URL ?? null,
    title:         item.ItemInfo?.Title?.DisplayValue,
    priceAmount:   item.Offers?.Listings?.[0]?.Price?.Amount,
    priceCurrency: item.Offers?.Listings?.[0]?.Price?.Currency,
  }));
}

// ── SigV4 helpers ────────────────────────────────────────────────────────────

function _sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function _hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function _getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate    = _hmacSha256(`AWS4${secret}`, date);
  const kRegion  = _hmacSha256(kDate, region);
  const kService = _hmacSha256(kRegion, service);
  return _hmacSha256(kService, "aws4_request");
}

/** Returns YYYYMMDDTHHMMSSZ (no dashes/colons, no milliseconds) */
function _isoBasic(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// ── Minimal PA-API response shape ────────────────────────────────────────────

interface _PaApiResponse {
  ItemsResult?: {
    Items?: Array<{
      ASIN: string;
      Images?: {
        Primary?: {
          Medium?: { URL?: string; Width?: number; Height?: number };
        };
      };
      ItemInfo?: {
        Title?: { DisplayValue?: string };
      };
      Offers?: {
        Listings?: Array<{
          Price?: { Amount?: number; Currency?: string };
        }>;
      };
    }>;
  };
  Errors?: Array<{ Code?: string; Message?: string }>;
}
