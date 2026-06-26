import { env } from "@/lib/env";

/**
 * Fire-and-forget: queue Beauty Blueprint infographic generation via internal route.
 */
export function kickOffInfographicsInBackground(reportId: string): void {
  const internalSecret = env.internal.secret;
  const appUrl = env.app.url;
  if (!internalSecret || internalSecret.length < 16) return;

  fetch(`${appUrl}/api/internal/trigger-infographics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({ reportId }),
  }).catch((e) => console.error("[kickOffInfographics] fire failed", e));
}
