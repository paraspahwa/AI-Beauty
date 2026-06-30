import { debugLog } from "@/lib/debug-log";

/** Internal paths only — blocks open redirects and auth-loop targets. */
const INTERNAL_PATH_RE = /^\/[^/]/;

const BLOCKED_PREFIXES = ["/auth", "/auth/"];

export function sanitizePostAuthPath(
  rawPath: string | null | undefined,
  fallback = "/upload",
): string {
  if (!rawPath || !INTERNAL_PATH_RE.test(rawPath)) {
    return fallback;
  }

  const pathOnly = rawPath.split("?")[0] ?? rawPath;
  if (BLOCKED_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`))) {
    // #region agent log
    debugLog("safe-redirect.ts", "blocked auth redirect", { pathOnly, fallback }, "H2");
    // #endregion
    return fallback;
  }

  return rawPath;
}
