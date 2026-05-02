import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
]);

function safeNextPath(rawPath: string | null): string {
  const candidate = rawPath ?? "/upload";
  // Guard against open redirect via paths like //evil.com (starts with / but is protocol-relative)
  return /^\/[^/]/.test(candidate) ? candidate : "/upload";
}

/**
 * GET /auth/callback
 * Supabase redirects here after magic-link email is clicked.
 * Exchanges the one-time code for a session cookie, then
 * sends the user to their intended destination (or /upload).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next") ?? searchParams.get("redirect"));

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (tokenHash && type && ALLOWED_OTP_TYPES.has(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or exchange failed — send to auth with an error hint
  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
