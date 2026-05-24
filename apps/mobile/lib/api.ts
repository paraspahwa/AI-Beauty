import { mobileEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export type MobileFaceShape = {
  shape: string;
  traits: string[];
  confidence: number;
};

export type MobileColorAnalysis = {
  season: string;
  undertone: string;
  description: string;
  metals?: string[];
  avoidColors?: { name: string; hex: string }[];
  palette?: { name: string; hex: string }[];
};

export type MobileSkinAnalysis = {
  type: string;
  concerns?: { label: string; severity: string }[];
  zones?: { zone: string; observation: string }[];
};

export type MobileGlasses = {
  goals?: string[];
  recommended?: { style: string; reason: string }[];
  fitTips?: string[];
};

export type MobileHairstyle = {
  styles?: { name: string; description: string }[];
  lengths?: { name: string; description: string }[];
  colors?: { name: string; description: string }[];
  avoid?: string[];
};

export type MobileStudioEntitlement = {
  tier: "free" | "report" | "studio_pro";
  remainingGens: number | null;
  usedGens: number | null;
  cap: number | null;
  periodResets: string | null;
  subscriptionId: string | null;
};

export type MobileChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MobileMakeupControls = {
  style?: "natural" | "glamorous" | "smoky_eyes" | "bold_lips" | "professional" | "korean_style" | "bridal";
  intensity?: "light" | "medium" | "heavy" | "dramatic";
  lipColor?: string;
  eyeshadow?: string;
  blushColor?: string;
  blushIntensity?: string;
  eyeliner?: string;
  contour?: boolean;
};

export type MobileHairColorControls = {
  colorName: string;
  colorHex?: string;
  styleName?: string;
};

export type MobileReport = {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
  isPaid: boolean;
  imageUrl: string;
  summary?: string;
  createdAt: string;
  studioEntitlement?: MobileStudioEntitlement;
  faceShape?: MobileFaceShape;
  colorAnalysis?: MobileColorAnalysis;
  skinAnalysis?: MobileSkinAnalysis;
  glasses?: MobileGlasses;
  hairstyle?: MobileHairstyle;
  error?: string | null;
};

export type MobileReportListItem = {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
  isPaid: boolean;
  createdAt: string;
};

export type MobileVaultAsset = {
  id: string;
  sourceType: "canvas" | "report";
  sourceId: string | null;
  tool: string;
  variant?: string | null;
  hdUrl: string;
  lowResUrl: string;
  createdAt: string;
  savedByUser?: boolean;
};

export type PaymentCreateResponse = {
  mode: "test" | "real";
  requiresRealCheckout: boolean;
  orderId: string;
  amount: number;
  currency: "INR" | "USD";
  keyId: string | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

export async function fetchWithAuth<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${mobileEnv.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText}`);
  }

  return (await response.json()) as T;
}

export async function analyzeSelfie(imageUri: string): Promise<{ reportId: string; visualsPending: boolean }> {
  const form = new FormData();
  form.append("image", {
    uri: imageUri,
    name: "selfie.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  return fetchWithAuth<{ reportId: string; visualsPending: boolean }>("/api/analyze", {
    method: "POST",
    body: form,
  });
}

export async function fetchReport(reportId: string): Promise<MobileReport> {
  return fetchWithAuth<MobileReport>(`/api/reports/${reportId}`);
}

export async function fetchSubscriptionStatus(): Promise<MobileStudioEntitlement> {
  return fetchWithAuth<MobileStudioEntitlement>("/api/subscriptions/status");
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

export async function fetchStudioVault(params?: {
  limit?: number;
  offset?: number;
  filter?: "all" | "canvas" | "report";
}): Promise<{ assets: MobileVaultAsset[]; total: number; limit: number; offset: number }> {
  const limit = params?.limit ?? 24;
  const offset = params?.offset ?? 0;
  const filter = params?.filter ?? "all";
  const query = `/api/studio/vault?limit=${limit}&offset=${offset}&filter=${filter}`;
  return fetchWithAuth<{ assets: MobileVaultAsset[]; total: number; limit: number; offset: number }>(query);
}

export async function removeStudioVaultAsset(assetId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth<{ ok: boolean }>(`/api/studio/vault/${assetId}`, {
    method: "DELETE",
  });
}

export async function createPaymentOrder(reportId: string): Promise<PaymentCreateResponse> {
  return fetchWithAuth<PaymentCreateResponse>("/api/payments/create", {
    method: "POST",
    body: JSON.stringify({ reportId }),
  });
}

export async function verifyTestPayment(reportId: string, orderId: string): Promise<{ ok: boolean; awaitingWebhook: boolean; unlocked?: boolean }> {
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

export async function fetchChatHistory(reportId: string): Promise<MobileChatMessage[]> {
  const response = await fetchWithAuth<{ messages?: MobileChatMessage[] }>(`/api/chat?reportId=${reportId}`);
  return response.messages ?? [];
}

export async function sendChatMessage(reportId: string, messages: MobileChatMessage[]): Promise<{ reply: string }> {
  return fetchWithAuth<{ reply: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ reportId, messages }),
  });
}

export async function generateMakeupPreview(
  reportId: string,
  controls: MobileMakeupControls,
): Promise<{ lowResUrl: string; hdUrl: string; asset?: { id: string; createdAt: string } | null }> {
  return fetchWithAuth<{ lowResUrl: string; hdUrl: string; asset?: { id: string; createdAt: string } | null }>(`/api/reports/${reportId}/makeup`, {
    method: "POST",
    body: JSON.stringify(controls),
  });
}

export async function generateHairColorPreview(
  reportId: string,
  controls: MobileHairColorControls,
): Promise<{ lowResUrl: string; hdUrl: string; asset?: { id: string; createdAt: string } | null }> {
  return fetchWithAuth<{ lowResUrl: string; hdUrl: string; asset?: { id: string; createdAt: string } | null }>(`/api/reports/${reportId}/hair-color`, {
    method: "POST",
    body: JSON.stringify(controls),
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<{ ok: boolean; cancelAtPeriodEnd?: boolean }> {
  return fetchWithAuth<{ ok: boolean; cancelAtPeriodEnd?: boolean }>("/api/subscriptions/cancel", {
    method: "POST",
    body: JSON.stringify({ subscriptionId }),
  });
}
