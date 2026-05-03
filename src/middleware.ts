import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that require a valid Supabase session */
const PROTECTED_PREFIXES = ["/upload", "/report", "/dashboard", "/success", "/admin"];

// ── IP rate limiter for expensive API routes ──────────────────────────────────
// Uses an in-process LRU window (edge-safe, no external store).
// Limits: /api/analyze → 5 req / 60 s per IP.
// Note: Edge middleware restarts wipe state between cold starts, which is acceptable —
//       the per-user burst guard in the route handler is the hard gate; this is a
//       lightweight first-pass filter that stops bots without a session.

const RATE_LIMIT_ROUTES = ["/api/analyze", "/api/reports"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8; // requests per window per IP

type WindowEntry = { count: number; resetAt: number };
// Max 4 096 entries — oldest evicted when full (LRU approximation via insertion order)
const ipWindows = new Map<string, WindowEntry>();
const IP_MAP_MAX = 4096;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = ipWindows.get(ip);

  if (!entry || now > entry.resetAt) {
    // Evict oldest entry when map is full
    if (!entry && ipWindows.size >= IP_MAP_MAX) {
      const firstKey = ipWindows.keys().next().value;
      if (firstKey !== undefined) ipWindows.delete(firstKey);
    }
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    ipWindows.set(ip, entry);
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}


// Admin emails that bypass IP rate limiting (must match env.auth.adminEmailAllowlist)
// We read directly from process.env here because middleware runs at edge before
// the full env module is available.
const ADMIN_EMAIL_ALLOWLIST: string[] = (
  process.env.ADMIN_EMAIL_ALLOWLIST ?? "paraspahwa5@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Always include the hardcoded owner email regardless of env
if (!ADMIN_EMAIL_ALLOWLIST.includes("paraspahwa5@gmail.com")) {
  ADMIN_EMAIL_ALLOWLIST.push("paraspahwa5@gmail.com");
}

const SUPABASE_AUTH_QUERY_KEYS = [
  "code",
  "token_hash",
  "type",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "provider_token",
  "provider_refresh_token",
  "error",
  "error_description",
] as const;

function hasSupabaseAuthParams(url: URL): boolean {
  return SUPABASE_AUTH_QUERY_KEYS.some((key) => url.searchParams.has(key));
}

function buildSafeNextFromCurrent(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/") return null;

  const params = new URLSearchParams(request.nextUrl.searchParams);
  for (const key of SUPABASE_AUTH_QUERY_KEYS) {
    params.delete(key);
  }

  const query = params.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── IP rate limiting for expensive API routes ──────────────────────────────
  if (RATE_LIMIT_ROUTES.some((r) => pathname.startsWith(r))) {
    const adminEmail = request.headers.get("x-admin-email")?.toLowerCase() ?? "";
    const isAdmin = ADMIN_EMAIL_ALLOWLIST.includes(adminEmail);
    if (!isAdmin) {
      const ip = getClientIp(request);
      if (isRateLimited(ip)) {
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
              "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
              "X-RateLimit-Window": "60s",
            },
          },
        );
      }
    }
  }

  // Handle malformed magic links
  if (pathname !== "/auth/callback" && hasSupabaseAuthParams(request.nextUrl)) {
    const callbackUrl = new URL("/auth/callback", request.url);

    for (const key of SUPABASE_AUTH_QUERY_KEYS) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) callbackUrl.searchParams.set(key, value);
    }

    const next = request.nextUrl.searchParams.get("next") ?? request.nextUrl.searchParams.get("redirect") ?? buildSafeNextFromCurrent(request);
    if (next && /^\/[^/]/.test(next)) {
      callbackUrl.searchParams.set("next", next);
    }

    return NextResponse.redirect(callbackUrl);
  }

  const { response, user } = await updateSession(request);
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const signIn = new URL("/auth", request.url);
    signIn.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signIn);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
