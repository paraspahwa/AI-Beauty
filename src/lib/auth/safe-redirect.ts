/** Internal paths only — blocks open redirects and auth-loop targets. */
const INTERNAL_PATH_RE = /^\/[^/]/;

const BLOCKED_PREFIXES = ["/auth", "/auth/"];
const MOBILE_APP_RETURN_PROTOCOL = "renovaara:";
const MOBILE_CHECKOUT_RETURN_VALUES = new Set(["report_return", "style_guide_return"]);

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

function matchesMobileReportPath(url: URL, reportId: string): boolean {
  const expectedPath = `/report/${reportId}`;
  if (url.pathname === expectedPath) return true;

  // Some custom-scheme link builders emit renovaara://report/{id}
  // instead of renovaara:///report/{id}.
  return `/${url.hostname}${url.pathname}` === expectedPath;
}

export function sanitizeMobileAppReturnUrl(
  rawUrl: string | string[] | null | undefined,
  reportId: string,
): string | undefined {
  const candidate = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  if (!candidate || /[\x00-\x1F\x7F]/.test(candidate)) return undefined;

  try {
    const url = new URL(candidate);
    if (url.protocol !== MOBILE_APP_RETURN_PROTOCOL) return undefined;
    if (url.username || url.password || url.hash) return undefined;
    if (!matchesMobileReportPath(url, reportId)) return undefined;

    const queryKeys = Array.from(url.searchParams.keys());
    const checkout = url.searchParams.get("checkout");
    if (
      queryKeys.length !== 1 ||
      queryKeys[0] !== "checkout" ||
      !checkout ||
      !MOBILE_CHECKOUT_RETURN_VALUES.has(checkout)
    ) {
      return undefined;
    }

    return candidate;
  } catch {
    return undefined;
  }
}
