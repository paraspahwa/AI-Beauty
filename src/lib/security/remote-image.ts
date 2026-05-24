const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

export function isSafeRemoteImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "::1") return false;
    if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) return false;

    return true;
  } catch {
    return false;
  }
}

export async function fetchRemoteImageBuffer(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<Buffer> {
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const maxBytes = opts?.maxBytes ?? 20 * 1024 * 1024;

  if (!isSafeRemoteImageUrl(url)) {
    throw new Error("Unsafe remote image URL");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error("Remote image download failed");
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error("Remote URL did not return image content");
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Remote image too large");
  }

  const result = Buffer.from(await response.arrayBuffer());
  if (result.length > maxBytes) {
    throw new Error("Remote image too large");
  }

  return result;
}