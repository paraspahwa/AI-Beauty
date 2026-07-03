/** Internal paths only — blocks open redirects and auth-loop targets. */
const INTERNAL_PATH_RE = /^\/[^/]/;

const BLOCKED_PREFIXES = ["/auth", "/auth/"];

function isSafeInternalPath(path: string): boolean {
  if (!INTERNAL_PATH_RE.test(path)) return false;
  if (path.includes("%") || path.includes("\\")) return false;

  try {
    const decoded = decodeURIComponent(path);
    if (!INTERNAL_PATH_RE.test(decoded) || decoded.startsWith("//")) return false;
  } catch {
    return false;
  }

  return true;
}

export function sanitizePostAuthPath(
  rawPath: string | null | undefined,
  fallback = "/upload",
): string {
  if (!rawPath || !isSafeInternalPath(rawPath)) {
    return fallback;
  }

  const pathOnly = rawPath.split("?")[0] ?? rawPath;
  if (BLOCKED_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`))) {
    return fallback;
  }

  return rawPath;
}
