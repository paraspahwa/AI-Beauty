/**
 * Lightweight event tracker.
 * - Dispatches a typed CustomEvent so any future analytics provider can subscribe.
 * - Calls window.plausible / window.gtag / window.posthog if present (progressive enhancement).
 * - Logs to console in development for observability.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  // Custom DOM event — subscribe with window.addEventListener("renovaara:track", handler)
  window.dispatchEvent(
    new CustomEvent("renovaara:track", { detail: { event, props } })
  );

  // Plausible
  if (typeof (window as any).plausible === "function") {
    (window as any).plausible(event, { props });
  }

  // Google Analytics 4
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", event, props);
  }

  // PostHog
  if (typeof (window as any).posthog?.capture === "function") {
    (window as any).posthog.capture(event, props);
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[track]", event, props);
  }
}
