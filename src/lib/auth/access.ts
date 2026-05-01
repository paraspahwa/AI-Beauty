import { env } from "@/lib/env";

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
