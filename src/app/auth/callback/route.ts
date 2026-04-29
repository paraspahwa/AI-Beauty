import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 * Supabase redirects here after magic-link email is clicked.
 * Exchanges the one-time code for a session cookie, then
 * sends the user to their intended destination (or /upload).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/upload";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure we only redirect to relative paths (security: prevent open redirect)
      const safeNext = next.startsWith("/") ? next : "/upload";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Code missing or exchange failed — send to auth with an error hint
  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
