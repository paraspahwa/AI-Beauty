import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that require a valid Supabase session */
const PROTECTED_PREFIXES = ["/upload", "/report", "/dashboard", "/success", "/admin"];

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

  // Handle malformed magic links like /?code=... by normalizing into /auth/callback.
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
