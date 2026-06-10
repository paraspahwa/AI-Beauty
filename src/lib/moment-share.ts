import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const MOMENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type MomentPayload = {
  b: string;
  a: string;
  exp: number;
  caption?: string;
};

function signPayload(payload: string): string {
  return createHmac("sha256", env.internalApiSecret).update(payload).digest("base64url");
}

export function createMomentToken(payload: Omit<MomentPayload, "exp"> & { exp?: number }): string {
  const full: MomentPayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + MOMENT_TTL_MS,
  };
  const json = JSON.stringify(full);
  return `${Buffer.from(json, "utf8").toString("base64url")}.${signPayload(json)}`;
}

export function parseMomentToken(token: string): MomentPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const expected = signPayload(json);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const parsed = JSON.parse(json) as MomentPayload;
    if (typeof parsed.b !== "string" || typeof parsed.a !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

const ALLOWED_URL_HOSTS = new Set([
  "fal.media",
  "storage.googleapis.com",
  "replicate.delivery",
  "pbxt.replicate.delivery",
]);

export function isAllowedMomentUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".supabase.co")) return true;
    if (host === new URL(env.app.url).hostname.toLowerCase()) return true;
    return ALLOWED_URL_HOSTS.has(host) || host.endsWith(".fal.media");
  } catch {
    return false;
  }
}

export async function persistMomentImages(
  beforeUrl: string,
  afterUrl: string,
  upload: (path: string, buffer: Buffer) => Promise<void>,
): Promise<{ beforePath: string; afterPath: string }> {
  const momentId = randomUUID();
  const base = `moments/${momentId}`;

  const [beforeRes, afterRes] = await Promise.all([
    fetch(beforeUrl, { signal: AbortSignal.timeout(15000) }),
    fetch(afterUrl, { signal: AbortSignal.timeout(15000) }),
  ]);

  if (!beforeRes.ok || !afterRes.ok) {
    throw new Error("Could not fetch images for share card");
  }

  const beforeBuffer = Buffer.from(await beforeRes.arrayBuffer());
  const afterBuffer = Buffer.from(await afterRes.arrayBuffer());

  const beforePath = `${base}/before.jpg`;
  const afterPath = `${base}/after.jpg`;
  await upload(beforePath, beforeBuffer);
  await upload(afterPath, afterBuffer);

  return { beforePath, afterPath };
}
