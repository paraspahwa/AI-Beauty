import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Routes that require a valid Supabase session */
const PROTECTED_PREFIXES = ["/upload", "/report", "/dashboard", "/success"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    // Check session using the already-refreshed cookies on the response
    const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const signIn = new URL("/auth", request.url);
      signIn.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signIn);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
