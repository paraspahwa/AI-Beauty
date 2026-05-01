import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that require a valid Supabase session */
const PROTECTED_PREFIXES = ["/upload", "/report", "/dashboard", "/success"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
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
