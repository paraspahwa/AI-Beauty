import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import type { CompiledReport } from "@web/types/report";
import type { VaultResponse } from "@web/types/vault";
import type { ManualPaidInfographicSection } from "@web/lib/ai/infographic-sections";

export type { CompiledReport as MobileReport };

export type MobileReportListItem = {
  id: string;
  status: CompiledReport["status"];
  isPaid: boolean;
  createdAt: string;
};

export type PaymentCreateResponse = {
  mode: "test" | "real";
  requiresRealCheckout: boolean;
  orderId: string;
  amount: number;
  currency: "INR" | "USD";
  keyId: string | null;
  product?: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

const MOBILE_API_TIMEOUT_MS = 30000;

function sanitizeApiErrorText(raw: string): string {
  return raw.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, 320);
}

export async function fetchWithAuth<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const apiBaseUrl = getValidatedMobileApiBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOBILE_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      body: options.body,
      signal: controller.signal,
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errText = sanitizeApiErrorText(await response.text());
      throw new Error(`API ${response.status}: ${errText || "Request failed"}`);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new Error("API returned a non-JSON response");
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`API request timed out after ${Math.round(MOBILE_API_TIMEOUT_MS / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAuthPdfUrl(reportId: string, variant: "report" | "styleGuide" = "report"): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = getValidatedMobileApiBaseUrl();
  const path = variant === "styleGuide" ? `/api/reports/${reportId}/pdf/style-guide` : `/api/reports/${reportId}/pdf`;
  return token ? `${base}${path}?access_token=${encodeURIComponent(token)}` : `${base}${path}`;
}

const ANALYZE_ACCEPT_TIMEOUT_MS = 120000;

type AnalyzeStreamEvent =
  | { type: "accepted"; reportId: string }
  | { type: "cached"; reportId: string }
  | { type: "completed"; reportId: string; visualsPending?: boolean }
  | { type: "failed"; message: string };

export async function startAnalysisFromSelfie(
  imageUri: string,
): Promise<{ reportId: string; visualsPending: boolean; cached?: boolean }> {
  const form = new FormData();
  form.append("image", {
    uri: imageUri,
    name: "selfie.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  form.append("intent", "report");

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required for full analysis");

  const apiBaseUrl = getValidatedMobileApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_ACCEPT_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}/api/analyze?stream=1`, {
      method: "POST",
      body: form,
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = sanitizeApiErrorText(await response.text());
      throw new Error(`API ${response.status}: ${errText || "Analysis failed"}`);
    }

    if (!response.body?.getReader) {
      return fetchWithAuth<{ reportId: string; visualsPending: boolean }>("/api/analyze", {
        method: "POST",
        body: form,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as AnalyzeStreamEvent;
        if (event.type === "accepted" || event.type === "cached") {
          void reader.cancel().catch(() => undefined);
          return {
            reportId: event.reportId,
            visualsPending: event.type === "accepted",
            cached: event.type === "cached",
          };
        }
        if (event.type === "completed") {
          return { reportId: event.reportId, visualsPending: event.visualsPending ?? false };
        }
        if (event.type === "failed") throw new Error(event.message);
      }
    }

    throw new Error("Analysis stream ended unexpectedly");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Analysis request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchReport(reportId: string): Promise<CompiledReport> {
  return fetchWithAuth<CompiledReport>(`/api/reports/${reportId}`);
}

export async function listReports(limit = 30): Promise<MobileReportListItem[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, status, is_paid, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    status: row.status as MobileReportListItem["status"],
    isPaid: Boolean(row.is_paid),
    createdAt: row.created_at as string,
  }));
}

export async function deleteReport(reportId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth<{ ok: boolean }>(`/api/reports/${reportId}/delete`, { method: "DELETE" });
}

export async function createPaymentOrder(
  reportId: string,
  product: "report_unlock" | "style_guide_addon" = "report_unlock",
): Promise<PaymentCreateResponse> {
  return fetchWithAuth<PaymentCreateResponse>("/api/payments/create", {
    method: "POST",
    body: JSON.stringify({ reportId, product }),
  });
}

export async function verifyTestPayment(
  reportId: string,
  orderId: string,
): Promise<{ ok: boolean; awaitingWebhook: boolean; unlocked?: boolean }> {
  return fetchWithAuth<{ ok: boolean; awaitingWebhook: boolean; unlocked?: boolean }>("/api/payments/verify", {
    method: "POST",
    body: JSON.stringify({
      reportId,
      razorpay_order_id: orderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_signature: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }),
  });
}

export async function ensureInfographics(reportId: string): Promise<{ ok: boolean; skipped?: boolean }> {
  return fetchWithAuth<{ ok: boolean; skipped?: boolean }>(`/api/reports/${reportId}/ensure-infographics`, {
    method: "POST",
  });
}

export async function generateInfographic(
  reportId: string,
  section: ManualPaidInfographicSection,
): Promise<{ ok: boolean; generating?: boolean; error?: string }> {
  return fetchWithAuth(`/api/reports/${reportId}/generate-infographic`, {
    method: "POST",
    body: JSON.stringify({ section }),
  });
}

export async function retryInfographic(
  reportId: string,
  section: ManualPaidInfographicSection,
): Promise<{ ok: boolean }> {
  return fetchWithAuth(`/api/reports/${reportId}/retry-infographic`, {
    method: "POST",
    body: JSON.stringify({ section }),
  });
}

export async function retryStyleGuide(reportId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth(`/api/reports/${reportId}/retry-style-guide`, { method: "POST" });
}

export async function uploadBodyImage(reportId: string, imageUri: string): Promise<{ ok: boolean }> {
  const form = new FormData();
  form.append("image", {
    uri: imageUri,
    name: "body.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  return fetchWithAuth(`/api/reports/${reportId}/body-image`, {
    method: "POST",
    body: form,
  });
}

export async function fetchVault(): Promise<VaultResponse> {
  return fetchWithAuth<VaultResponse>("/api/vault");
}

export async function deleteVaultItem(itemId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth("/api/vault/items", {
    method: "DELETE",
    body: JSON.stringify({ itemId }),
  });
}

/** @deprecated use startAnalysisFromSelfie */
export const analyzeSelfie = startAnalysisFromSelfie;
