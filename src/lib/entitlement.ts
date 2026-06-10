/**
 * Server-side entitlement helper.
 *
 * Calls the get_studio_entitlement Supabase RPC and returns a typed result
 * describing the user's current plan tier and remaining AI-generation quota.
 *
 * Import only in server code (API routes, page.tsx, server actions).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  FREE_STUDIO_CAP,
  REPORT_STUDIO_CAP,
  STUDIO_PRO_CAP,
  getMonthlyGenerationUsage,
  getReportStudioUsage,
} from "@/lib/studio-access";
import type { ColorAnalysisResult } from "@/types/report";

export type PlanTier = "free" | "report" | "studio_pro";

export interface StudioEntitlement {
  tier: PlanTier;
  /** Monthly AI gens remaining. null for free/report (not metered at account level). */
  remainingGens: number | null;
  /** Monthly AI gens used this period. null for free/report. */
  usedGens: number | null;
  /** Hard cap for this tier. 150 for studio_pro, null otherwise. */
  cap: number | null;
  /** ISO date string of next period reset. null for free/report. */
  periodResets: string | null;
  /** Supabase UUID of the active subscription row. null if no subscription. */
  subscriptionId: string | null;
}

const FALLBACK: StudioEntitlement = {
  tier: "free",
  remainingGens: null,
  usedGens: null,
  cap: null,
  periodResets: null,
  subscriptionId: null,
};

export async function getStudioEntitlement(userId: string): Promise<StudioEntitlement> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("get_studio_entitlement", { p_user: userId });
    if (error || !data) {
      console.warn("[entitlement] get_studio_entitlement failed", error?.message);
      return FALLBACK;
    }
    const tier = (data.tier as PlanTier) ?? "free";

    if (tier === "studio_pro") {
      return {
        tier,
        remainingGens: data.remaining_gens ?? null,
        usedGens: data.used_gens ?? null,
        cap: data.cap ?? STUDIO_PRO_CAP,
        periodResets: data.period_resets ?? null,
        subscriptionId: data.subscription_id ?? null,
      };
    }

    // Free / report: enrich with monthly free studio quota from usage_counters
    const usage = await getMonthlyGenerationUsage(admin, userId);
    const cap = FREE_STUDIO_CAP;
    const nextPeriod = new Date();
    nextPeriod.setMonth(nextPeriod.getMonth() + 1, 1);
    nextPeriod.setHours(0, 0, 0, 0);

    return {
      tier,
      remainingGens: Math.max(0, cap - usage.used),
      usedGens: usage.used,
      cap,
      periodResets: nextPeriod.toISOString(),
      subscriptionId: null,
    };
  } catch (err) {
    console.warn("[entitlement] unexpected error", err);
    return FALLBACK;
  }
}

/**
 * Returns true when the user has active studio_pro subscription.
 * Use this to decide if generation routes should apply monthly quota.
 */
export function isStudioPro(entitlement: StudioEntitlement): boolean {
  return entitlement.tier === "studio_pro";
}

/** Strip color analysis for unpaid report previews (progressive unlock reveals teasers instead). */
export function redactColorAnalysisForPreview(_color: unknown): ColorAnalysisResult | undefined {
  return undefined;
}

/** Truncated summary teaser for unpaid report previews (matches SSR page). */
export function previewSummaryForUnpaid(summary: unknown, max = 280): string | undefined {
  if (typeof summary !== "string" || !summary) return undefined;
  return summary.slice(0, max) + (summary.length > max ? "…" : "");
}

/** Align entitlement display with per-report try-on cap for paid reports. */
export async function enrichReportStudioEntitlement(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  reportId: string,
  reportIsPaid: boolean,
  base: StudioEntitlement,
): Promise<StudioEntitlement> {
  if (base.tier === "studio_pro") return base;

  if (reportIsPaid) {
    const used = await getReportStudioUsage(admin, userId, reportId);
    return {
      ...base,
      tier: "report",
      remainingGens: Math.max(0, REPORT_STUDIO_CAP - used),
      usedGens: used,
      cap: REPORT_STUDIO_CAP,
      periodResets: null,
      subscriptionId: base.subscriptionId,
    };
  }

  return base;
}

/**
 * Canvas Quota interface for standalone try-on mode
 * Free users: 3 gens/month on canvas
 * Paid users: 3 gens/month on canvas (separate from report studio)
 * Studio Pro: Unlimited
 */
export interface CanvasQuota {
  tier: PlanTier;
  remaining: number;
  used: number;
  limit: number;
  periodResets: string | null;
}

/**
 * Get canvas try-on quota for user.
 * Returns remaining generations for THIS MONTH in canvas mode.
 */
export async function getCanvasQuota(userId: string): Promise<CanvasQuota> {
  try {
    const admin = createSupabaseAdminClient();
    
    // Get user tier
    const entitlement = await getStudioEntitlement(userId);
    
    // Studio Pro = unlimited
    if (entitlement.tier === "studio_pro") {
      return {
        tier: "studio_pro",
        remaining: 999,
        used: 0,
        limit: 999,
        periodResets: entitlement.periodResets,
      };
    }

    const usage = await getMonthlyGenerationUsage(admin, userId);
    const limit = FREE_STUDIO_CAP;
    const remaining = Math.max(0, limit - usage.used);

    return {
      tier: entitlement.tier,
      remaining,
      used: usage.used,
      limit,
      periodResets: entitlement.periodResets,
    };
  } catch (err) {
    console.warn("[getCanvasQuota] unexpected error:", err);
    return {
      tier: "free",
      remaining: 3,
      used: 0,
      limit: 3,
      periodResets: null,
    };
  }
}
