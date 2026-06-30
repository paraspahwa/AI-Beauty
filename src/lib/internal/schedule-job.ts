import { after } from "next/server";
import { env } from "@/lib/env";

/**
 * Fire-and-forget internal POST. Uses Next.js `after()` so Vercel keeps the
 * runtime alive until each request is dispatched (plain fetch in webhooks often
 * gets cut off when the handler returns).
 */
export function scheduleInternalPost(path: string, body: Record<string, unknown>): void {
  const internalSecret = env.internal.secret;
  const appUrl = env.app.url.replace(/\/$/, "");

  if (!internalSecret || internalSecret.length < 16) {
    console.warn(`[scheduleInternalPost] INTERNAL_API_SECRET missing — skipped ${path}`);
    return;
  }

  const run = () =>
    fetch(`${appUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify(body),
    }).catch((err) => {
      console.error(`[scheduleInternalPost] ${path} dispatch failed`, err);
    });

  try {
    after(run);
  } catch {
    void run();
  }
}
