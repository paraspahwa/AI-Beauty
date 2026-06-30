import { env } from "@/lib/env";
import type { createSupabaseAdminClient } from "@/lib/supabase/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns true when the signed-in user's email is listed in ADMIN_EMAIL_ALLOWLIST.
 */
export function isAdminUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.auth.adminEmailAllowlist.includes(normalizeEmail(email));
}

/**
 * Premium access is granted when the report has been paid OR the user is an admin.
 */
export function hasPremiumAccess(input: {
  isPaid: boolean;
  userEmail: string | null | undefined;
}): boolean {
  return input.isPaid || isAdminUserEmail(input.userEmail);
}

/** Load report owner email for internal/background jobs (no session). */
export async function fetchProfileEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const email = data?.email;
  return typeof email === "string" && email.length > 0 ? email : null;
}

/** Premium check for background jobs using DB row + optional known email. */
export async function hasPremiumAccessForReport(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: { is_paid: boolean; user_id: string },
  userEmail?: string | null,
): Promise<boolean> {
  if (row.is_paid) return true;
  const email = userEmail ?? (await fetchProfileEmail(admin, row.user_id));
  return isAdminUserEmail(email);
}

/** Style Guide add-on access — separate from main report unlock. */
export function hasStyleGuideAccess(input: {
  isStyleGuidePaid: boolean;
  userEmail: string | null | undefined;
}): boolean {
  return input.isStyleGuidePaid || isAdminUserEmail(input.userEmail);
}
