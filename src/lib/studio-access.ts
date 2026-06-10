/**
 * Shared studio generation access checks for report + canvas routes.
 * Keeps quotas aligned between UI and API.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_COPY } from "@/lib/product-copy";

export const FREE_STUDIO_CAP = PRODUCT_COPY.free.studioGensPerMonth;
export const STUDIO_PRO_CAP = PRODUCT_COPY.studioPro.studioGensPerMonth;
export const REPORT_STUDIO_CAP = PRODUCT_COPY.report.studioGensIncluded;

export type StudioAccessDenied = {
  allowed: false;
  status: 402 | 429;
  error: string;
  code: "PAYMENT_REQUIRED" | "QUOTA_EXCEEDED" | "FREE_QUOTA_EXCEEDED" | "REPORT_QUOTA_EXCEEDED";
};

export type StudioAccessResult = { allowed: true } | StudioAccessDenied;

type AdminClient = SupabaseClient;

export async function getUserPlanTier(admin: AdminClient, userId: string): Promise<string> {
  const { data } = await admin.rpc("get_user_plan_tier", { p_user: userId });
  return (data as string | null) ?? "free";
}

export async function getReportStudioUsage(
  admin: AdminClient,
  userId: string,
  reportId: string,
): Promise<number> {
  const { count } = await admin
    .from("generated_assets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("report_id", reportId);
  return count ?? 0;
}

/**
 * Gate report-scoped studio generations (makeup, hair, try-on).
 */
export async function assertReportStudioAccess(
  admin: AdminClient,
  userId: string,
  reportIsPaid: boolean,
  options?: { paidOnly?: boolean; reportId?: string },
): Promise<StudioAccessResult> {
  const planTier = await getUserPlanTier(admin, userId);

  if (planTier === "studio_pro") {
    return consumeStudioProQuota(admin, userId);
  }

  if (options?.paidOnly) {
    if (!reportIsPaid) {
      return {
        allowed: false,
        status: 402,
        error: "Payment required",
        code: "PAYMENT_REQUIRED",
      };
    }
    return { allowed: true };
  }

  if (reportIsPaid && options?.reportId) {
    const used = await getReportStudioUsage(admin, userId, options.reportId);
    if (used >= REPORT_STUDIO_CAP) {
      return {
        allowed: false,
        status: 429,
        error: `Report try-on limit reached (${REPORT_STUDIO_CAP} included). Upgrade to Studio Pro for more.`,
        code: "REPORT_QUOTA_EXCEEDED",
      };
    }
    return { allowed: true };
  }

  if (reportIsPaid) {
    return { allowed: true };
  }

  return consumeFreeStudioQuota(admin, userId);
}

/** Gate canvas / logged-in studio generations for non–Studio Pro users. */
export async function assertCanvasStudioAccess(
  admin: AdminClient,
  userId: string,
): Promise<StudioAccessResult> {
  const planTier = await getUserPlanTier(admin, userId);

  if (planTier === "studio_pro") {
    return consumeStudioProQuota(admin, userId);
  }

  return consumeFreeStudioQuota(admin, userId);
}

async function consumeStudioProQuota(admin: AdminClient, userId: string): Promise<StudioAccessResult> {
  const allowed = await admin.rpc("try_consume_generation", { p_user: userId, p_cap: STUDIO_PRO_CAP });
  if (!allowed.data) {
    return {
      allowed: false,
      status: 429,
      error: `Monthly generation limit reached (${STUDIO_PRO_CAP}). Resets at the start of next billing period.`,
      code: "QUOTA_EXCEEDED",
    };
  }
  return { allowed: true };
}

async function consumeFreeStudioQuota(admin: AdminClient, userId: string): Promise<StudioAccessResult> {
  const allowed = await admin.rpc("try_consume_generation", { p_user: userId, p_cap: FREE_STUDIO_CAP });
  if (!allowed.data) {
    return {
      allowed: false,
      status: 429,
      error: `Free try-on limit reached (${FREE_STUDIO_CAP}/month). Sign in to save looks or unlock your full report for more.`,
      code: "FREE_QUOTA_EXCEEDED",
    };
  }
  return { allowed: true };
}

/** Read monthly usage for entitlement display (does not consume). */
export async function getMonthlyGenerationUsage(
  admin: AdminClient,
  userId: string,
): Promise<{ used: number; cap: number }> {
  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await admin
    .from("usage_counters")
    .select("ai_generations")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  const planTier = await getUserPlanTier(admin, userId);
  const cap = planTier === "studio_pro" ? STUDIO_PRO_CAP : FREE_STUDIO_CAP;
  return { used: (data?.ai_generations as number | undefined) ?? 0, cap };
}

export function studioAccessToResponse(denied: StudioAccessDenied) {
  return { error: denied.error, code: denied.code };
}
