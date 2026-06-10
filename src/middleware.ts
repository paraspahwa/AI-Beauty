import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that require a valid Supabase session */
const PROTECTED_PREFIXES = ["/upload", "/report", "/dashboard", "/success", "/admin"];

// ── IP rate limiter for expensive API routes ──────────────────────────────────
// Uses an in-process LRU window (edge-safe, no external store).
// Note: Edge middleware restarts wipe state between cold starts, which is acceptable —
//       the per-user burst guard in the route handler is the hard gate; this is a
//       lightweight first-pass filter that stops bots without a session.

// Rate-limit expensive API routes:
//   /api/analyze         → 8 req / 60 s per IP  (ML pipeline — very expensive)
//   /api/chat            → 30 req / 60 s per IP  (OpenAI chat — moderate cost)
//   /api/reports (POST)  → 15 req / 60 s per IP  (Replicate image generation)
const RATE_LIMIT_ROUTES: Array<{ prefix: string; max: number }> = [
  { prefix: "/api/studio",              max: 15 },
  { prefix: "/api/analyze",             max: 8  },
  { prefix: "/api/chat/visitor",        max: 10 }, // unauthenticated — stricter
  { prefix: "/api/chat",                max: 30 },
  { prefix: "/api/reports",             max: 15 },
  { prefix: "/api/payments",            max: 10 },
  { prefix: "/api/subscriptions",       max: 10 },
  { prefix: "/api/capsule",             max: 15 },
  { prefix: "/api/ingredients/compare",   max: 10 }, // comparison — two AI calls, budget carefully
  { prefix: "/api/ingredients",            max: 20 }, // single ingredient analysis
];
const RATE_LIMIT_WINDOW_MS = 60_000;

type WindowEntry = { count: number; resetAt: number };
// Max 4 096 entries — oldest evicted when full (LRU approximation via insertion order)
const ipWindows = new Map<string, WindowEntry>();
const IP_MAP_MAX = 4096;

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function isRateLimited(ip: string, prefix: string, max: number): boolean {
  const now = Date.now();
  // Key includes the route prefix so routes with the same max don't share counters
  const key = `${ip}:${prefix}`;
  let entry = ipWindows.get(key);

  if (!entry || now > entry.resetAt) {
    if (!entry && ipWindows.size >= IP_MAP_MAX) {
      const firstKey = ipWindows.keys().next().value;
      if (firstKey !== undefined) ipWindows.delete(firstKey);
    }
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    ipWindows.set(key, entry);
    return false;
  }

  entry.count += 1;
  return entry.count > max;
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
  // Admin bypass is NOT done via headers (trivially spoofable). The per-user
  // quota in the route handler uses verified Supabase auth and already skips
  // admins. The IP limiter here is a lightweight first-pass filter only.
  const matchedRoute = RATE_LIMIT_ROUTES.find((r) => pathname.startsWith(r.prefix));
  if (matchedRoute) {
    const ip = getClientIp(request);
    // If no identifiable IP (e.g. absent proxy headers), skip the in-process limiter
    // and fall through to the DB-layer burst/quota checks which are the hard gate.
    if (ip !== null && isRateLimited(ip, matchedRoute.prefix, matchedRoute.max)) {
      // #region agent log
      if (matchedRoute.prefix === "/api/studio") {
        fetch('http://127.0.0.1:7426/ingest/c98621ce-d232-4690-a505-eaf5b197033b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6b59e2'},body:JSON.stringify({sessionId:'6b59e2',location:'middleware.ts:rateLimit',message:'studio rate limit hit',data:{prefix:matchedRoute.prefix,pathname},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": String(matchedRoute.max),
            "X-RateLimit-Window": "60s",
          },
        },
      );
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

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const { response, user } = await updateSession(request, {
    requireUser: false,
    requireSession: isProtected,
  });

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
