/** Canonical URLs for Studio Pro subscription checkout. */

export const STUDIO_PRO_CHECKOUT_PATH = "/dashboard?checkout=studio_pro";

export function studioProAuthUrl(): string {
  return `/auth?plan=studio_pro&redirect=${encodeURIComponent(STUDIO_PRO_CHECKOUT_PATH)}`;
}

export function resolvePostAuthPath(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect");
  const plan = searchParams.get("plan");

  if (redirect && /^\/[^/]/.test(redirect)) {
    return redirect;
  }

  if (plan === "studio_pro") {
    return STUDIO_PRO_CHECKOUT_PATH;
  }

  return "/upload";
}
