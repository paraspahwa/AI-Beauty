/**
 * Client-side currency detection.
 *
 * Rules:
 *  - If user's timezone starts with "Asia/Kolkata" (or "Asia/Calcutta") → INR
 *  - Everything else → USD
 *
 * This is a best-effort heuristic.  The real charge currency is determined
 * server-side by the same rule, so the two stay in sync.
 */

export type SupportedCurrency = "INR" | "USD";

export function detectCurrency(): SupportedCurrency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "INR";
  } catch {
    // Intl not available — default to USD
  }
  return "USD";
}
