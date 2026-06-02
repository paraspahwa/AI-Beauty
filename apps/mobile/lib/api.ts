import { getValidatedMobileApiBaseUrl } from "@/lib/env";
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

export type MobileFaceLandmark = {
  x: number;
  y: number;
};

export type MobileFaceLandmarks = {
  faceShape?: MobileFaceLandmark;
  eyes?: MobileFaceLandmark;
  nose?: MobileFaceLandmark;
  eyebrows?: MobileFaceLandmark;
  cheeks?: MobileFaceLandmark;
  lips?: MobileFaceLandmark;
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

export type MobileFeaturePart = {
  shape: string;
  notes: string;
};

export type MobileFeatures = {
  eyes?: MobileFeaturePart;
  eyebrows?: MobileFeaturePart;
  nose?: MobileFeaturePart;
  lips?: MobileFeaturePart;
  cheeks?: MobileFeaturePart;
};

export type MobileVisualAssetStatus = "pending" | "ready" | "failed" | "missing";

export type MobileVisualAsset = {
  mime?: string;
  width?: number;
  height?: number;
  label?: string;
  styleName?: string;
  path?: string;
  signedUrl?: string;
  status?: MobileVisualAssetStatus;
  [key: string]: unknown;
};

export type MobileVisualAssets = {
  version?: number;
  bucket?: string;
  basePath?: string;
  assets?: {
    landmarkOverlay?: MobileVisualAsset;
    paletteBoard?: MobileVisualAsset;
    glassesPreviews?: MobileVisualAsset[];
    hairstylePreviews?: MobileVisualAsset[];
    colorSwatchPreviews?: MobileVisualAsset[];
    makeupPreviews?: MobileVisualAsset[];
  };
  [key: string]: unknown;
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

export type MobileChatBookmark = {
  id: string;
  content: string;
  createdAt: string;
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

export type MobilePaletteColor = {
  name: string;
  hex: string;
};

export type MobileOutfitOccasion = "casual" | "work" | "date" | "wedding" | "travel";

export type MobileOutfitVibe = "minimal" | "classic" | "bold" | "romantic" | "street";

export type MobileOutfitLook = {
  title: string;
  occasion: MobileOutfitOccasion;
  vibe: MobileOutfitVibe;
  pieces: string[];
  accentColors: MobilePaletteColor[];
  metal: string;
  whyItWorks: string;
};

export type MobileOutfitFeedback = {
  liked: boolean;
  saved: boolean;
  worn: boolean;
};

export type MobileOutfitSession = {
  id: string;
  createdAt: string;
  occasion: MobileOutfitOccasion;
  vibe: MobileOutfitVibe;
  season: string;
  undertone: string;
  looks: MobileOutfitLook[];
  feedback?: MobileOutfitFeedback;
};

export type MobileCanvasColorScan = {
  season?: string;
  undertone?: string;
  palette?: MobilePaletteColor[];
  avoidColors?: MobilePaletteColor[];
};

export type MobileCanvasGenerateMode = "makeup" | "hair" | "outfit";

export type MobileCanvasOutfitLook = {
  title: string;
  pieces: string[];
  notes: string;
  palette?: MobilePaletteColor[];
};

export type MobileCanvasOutfitResult = {
  occasion: string;
  vibe: string;
  looks: MobileCanvasOutfitLook[];
  summary: string;
};

export type MobileCanvasGenerateResponse = {
  lowResUrl: string;
  hdUrl: string;
  asset?: { id: string; createdAt: string } | null;
  outfit?: MobileCanvasOutfitResult;
};

export type MobileCanvasUploadResponse = {
  canvasId: string;
  photoUrl: string;
  quota: {
    remaining: number;
    tier: string;
    usedThisMonth: number;
  };
};

export type MobileCanvasShareResponse = {
  shareToken: string;
  shareUrl: string;
};

export type MobileGlassesPreviewInput = {
  clothImageUri: string;
  clothImageName?: string;
  clothImageMime?: string;
  personImageUri?: string;
  personImageName?: string;
  personImageMime?: string;
  sourceAssetId?: string;
};

export type MobileReport = {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
  isPaid: boolean;
  imageUrl: string;
  shareToken?: string | null;
  summary?: string;
  createdAt: string;
  studioEntitlement?: MobileStudioEntitlement;
  faceShape?: MobileFaceShape;
  colorAnalysis?: MobileColorAnalysis;
  skinAnalysis?: MobileSkinAnalysis;
  features?: MobileFeatures;
  glasses?: MobileGlasses;
  hairstyle?: MobileHairstyle;
  visualAssets?: MobileVisualAssets;
  faceLandmarks?: MobileFaceLandmarks;
  error?: string | null;
};

export type AnalyzeIntent = "report" | "studio_pro";

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

export type ReportShareResponse = {
  shareToken: string;
  shareUrl: string;
};

export type MobileIngredientFlag = {
  name: string;
  verdict: "beneficial" | "neutral" | "caution" | "avoid";
  reason: string;
};

export type MobileIngredientAnalysis = {
  overallScore: number;
  summary: string;
  highlights: string[];
  concerns: string[];
  flags: MobileIngredientFlag[];
};

export type MobileProductComparisonSide = {
  score: number;
  highlights: string[];
  concerns: string[];
  flags: MobileIngredientFlag[];
};

export type MobileProductComparisonResult = {
  winner: "A" | "B" | "tie";
  winnerReason: string;
  recommendation: string;
  productA: MobileProductComparisonSide;
  productB: MobileProductComparisonSide;
};

export type MobileStyleDnaPrefs = {
  colorSeason: string | null;
  undertone: string | null;
  faceShape: string | null;
  skinType: string | null;
  metals: string[];
  palette: string[];
  updatedAt: string | null;
};

export type MobileStyleDnaLatest = {
  id: string;
  createdAt: string;
  colorAnalysis?: MobileColorAnalysis | null;
  faceShape?: MobileFaceShape | null;
  skinAnalysis?: MobileSkinAnalysis | null;
  hairstyle?: MobileHairstyle | null;
};

export type MobileStyleDnaSummary = {
  totalReports: number;
  prefs: MobileStyleDnaPrefs | null;
  latest: MobileStyleDnaLatest | null;
};

export type MobileProgressReport = {
  id: string;
  createdAt: string;
  colorAnalysis?: MobileColorAnalysis | null;
  faceShape?: MobileFaceShape | null;
  skinAnalysis?: MobileSkinAnalysis | null;
  isPaid: boolean;
  status: string;
};

export type MobileCloudDataRemovalResult = {
  ok: boolean;
  removed: {
    canvases: number;
    generatedAssets: number;
    storageFiles: number;
  };
  storageCleanupFailed?: boolean;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

export async function fetchWithAuth<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const apiBaseUrl = getValidatedMobileApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}${path}`, {
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

export async function analyzeSelfie(
  imageUri: string,
  _intent?: AnalyzeIntent,
): Promise<{ reportId: string; visualsPending: boolean }> {
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

export async function uploadStudioCanvas(
  imageUri: string,
  fileName = "canvas-selfie.jpg",
  mimeType = "image/jpeg",
): Promise<MobileCanvasUploadResponse> {
  const form = new FormData();
  form.append("file", {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  return fetchWithAuth<MobileCanvasUploadResponse>("/api/studio/upload", {
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

export async function fetchChatBookmarks(reportId: string): Promise<MobileChatBookmark[]> {
  const response = await fetchWithAuth<{ bookmarks?: { id: string; content: string; created_at: string }[] }>(`/api/chat/bookmarks?reportId=${reportId}`);
  return (response.bookmarks ?? []).map((item) => ({
    id: item.id,
    content: item.content,
    createdAt: item.created_at,
  }));
}

export async function saveChatBookmark(reportId: string, content: string): Promise<MobileChatBookmark> {
  const response = await fetchWithAuth<{ bookmark: { id: string; content: string; created_at: string } }>("/api/chat/bookmarks", {
    method: "POST",
    body: JSON.stringify({ reportId, content }),
  });

  return {
    id: response.bookmark.id,
    content: response.bookmark.content,
    createdAt: response.bookmark.created_at,
  };
}

export async function deleteChatBookmark(bookmarkId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth<{ ok: boolean }>(`/api/chat/bookmarks/${bookmarkId}`, {
    method: "DELETE",
  });
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

export async function generateGlassesPreview(
  reportId: string,
  input: MobileGlassesPreviewInput,
): Promise<{ lowResUrl: string; hdUrl: string; stored?: boolean; asset?: { id: string; createdAt: string } | null }> {
  const form = new FormData();
  form.append("clothImage", {
    uri: input.clothImageUri,
    name: input.clothImageName ?? "glasses-reference.jpg",
    type: input.clothImageMime ?? "image/jpeg",
  } as unknown as Blob);

  if (input.personImageUri) {
    form.append("personImage", {
      uri: input.personImageUri,
      name: input.personImageName ?? "person-image.jpg",
      type: input.personImageMime ?? "image/jpeg",
    } as unknown as Blob);
  }

  if (input.sourceAssetId) {
    form.append("sourceAssetId", input.sourceAssetId);
  }

  return fetchWithAuth<{ lowResUrl: string; hdUrl: string; stored?: boolean; asset?: { id: string; createdAt: string } | null }>(`/api/reports/${reportId}/virtual-tryon`, {
    method: "POST",
    body: form,
  });
}

export async function generateReportOutfits(
  reportId: string,
  payload: { occasion: MobileOutfitOccasion; vibe: MobileOutfitVibe },
): Promise<{ looks: MobileOutfitLook[]; session?: MobileOutfitSession; history?: MobileOutfitSession[] }> {
  return fetchWithAuth<{ looks: MobileOutfitLook[]; session?: MobileOutfitSession; history?: MobileOutfitSession[] }>(`/api/reports/${reportId}/outfit-generator`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchReportOutfitHistory(reportId: string): Promise<MobileOutfitSession[]> {
  const response = await fetchWithAuth<{ history?: MobileOutfitSession[] }>(`/api/reports/${reportId}/outfit-generator`);
  return response.history ?? [];
}

export async function toggleReportOutfitFeedback(
  reportId: string,
  sessionId: string,
  field: keyof MobileOutfitFeedback,
  value?: boolean,
): Promise<{ session: MobileOutfitSession; history: MobileOutfitSession[] }> {
  return fetchWithAuth<{ session: MobileOutfitSession; history: MobileOutfitSession[] }>(`/api/reports/${reportId}/outfit-generator`, {
    method: "PATCH",
    body: JSON.stringify({ sessionId, field, value }),
  });
}

export async function generateReportColorSwatchSlot(
  reportId: string,
  slot: number,
): Promise<{ ok: boolean; slot: number; status?: MobileVisualAssetStatus; skipped?: boolean }> {
  return fetchWithAuth<{ ok: boolean; slot: number; status?: MobileVisualAssetStatus; skipped?: boolean }>(`/api/reports/${reportId}/visuals/colors?slot=${slot}`, {
    method: "POST",
  });
}

export async function scanStudioCanvasColor(canvasId: string): Promise<MobileCanvasColorScan> {
  const response = await fetchWithAuth<{ analysis?: MobileCanvasColorScan }>("/api/studio/scan-color", {
    method: "POST",
    body: JSON.stringify({ canvasId }),
  });
  return response.analysis ?? {};
}

export async function generateStudioCanvas(
  canvasId: string,
  mode: MobileCanvasGenerateMode,
  options: Record<string, unknown>,
): Promise<MobileCanvasGenerateResponse> {
  return fetchWithAuth<MobileCanvasGenerateResponse>("/api/studio/generate", {
    method: "POST",
    body: JSON.stringify({
      contextType: "canvas",
      contextId: canvasId,
      mode,
      options,
    }),
  });
}

export async function createStudioCanvasShareLink(canvasId: string): Promise<MobileCanvasShareResponse> {
  return fetchWithAuth<MobileCanvasShareResponse>("/api/studio/share", {
    method: "POST",
    body: JSON.stringify({ canvasId }),
  });
}

export async function revokeStudioCanvasShareLink(canvasId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth<{ ok: boolean }>("/api/studio/share", {
    method: "DELETE",
    body: JSON.stringify({ canvasId }),
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<{ ok: boolean; cancelAtPeriodEnd?: boolean }> {
  return fetchWithAuth<{ ok: boolean; cancelAtPeriodEnd?: boolean }>("/api/subscriptions/cancel", {
    method: "POST",
    body: JSON.stringify({ subscriptionId }),
  });
}

export async function createReportShareLink(reportId: string): Promise<ReportShareResponse> {
  return fetchWithAuth<ReportShareResponse>(`/api/reports/${reportId}/share`, {
    method: "POST",
  });
}

export async function revokeReportShareLink(reportId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth<{ ok: boolean }>(`/api/reports/${reportId}/share`, {
    method: "DELETE",
  });
}

export async function deleteReport(reportId: string): Promise<{ ok: boolean }> {
  return fetchWithAuth<{ ok: boolean }>(`/api/reports/${reportId}/delete`, {
    method: "DELETE",
  });
}

export async function requestCloudDataRemoval(): Promise<MobileCloudDataRemovalResult> {
  return fetchWithAuth<MobileCloudDataRemovalResult>("/api/privacy/cloud-data", {
    method: "POST",
  });
}

export async function analyzeIngredients(
  ingredients: string,
  skinContext?: { type: string; concerns: string[] },
): Promise<MobileIngredientAnalysis> {
  return fetchWithAuth<MobileIngredientAnalysis>("/api/ingredients/analyze", {
    method: "POST",
    body: JSON.stringify({ ingredients, skinContext }),
  });
}

export async function compareIngredients(
  productA: { name?: string; ingredients: string },
  productB: { name?: string; ingredients: string },
  skinContext?: { type: string; concerns: string[] },
): Promise<MobileProductComparisonResult> {
  return fetchWithAuth<MobileProductComparisonResult>("/api/ingredients/compare", {
    method: "POST",
    body: JSON.stringify({ productA, productB, skinContext }),
  });
}

export async function fetchStyleDnaSummary(): Promise<MobileStyleDnaSummary> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    return { totalReports: 0, prefs: null, latest: null };
  }

  const prefsPromise = supabase
    .from("user_style_prefs")
    .select("color_season, undertone, face_shape, skin_type, prefs, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const latestPromise = supabase
    .from("reports")
    .select("id, created_at, color_analysis, face_shape, skin_analysis, hairstyle")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const countPromise = supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const [prefsResult, latestResult, countResult] = await Promise.allSettled([prefsPromise, latestPromise, countPromise]);

  const prefs = prefsResult.status === "fulfilled" && prefsResult.value.data
    ? {
        colorSeason: (prefsResult.value.data.color_season as string | null) ?? null,
        undertone: (prefsResult.value.data.undertone as string | null) ?? null,
        faceShape: (prefsResult.value.data.face_shape as string | null) ?? null,
        skinType: (prefsResult.value.data.skin_type as string | null) ?? null,
        metals: Array.isArray((prefsResult.value.data.prefs as { metals?: string[] } | null)?.metals)
          ? ((prefsResult.value.data.prefs as { metals?: string[] }).metals ?? [])
          : [],
        palette: Array.isArray((prefsResult.value.data.prefs as { palette?: string[] } | null)?.palette)
          ? ((prefsResult.value.data.prefs as { palette?: string[] }).palette ?? [])
          : [],
        updatedAt: (prefsResult.value.data.updated_at as string | null) ?? null,
      }
    : null;

  const latest = latestResult.status === "fulfilled" && latestResult.value.data
    ? {
        id: latestResult.value.data.id as string,
        createdAt: latestResult.value.data.created_at as string,
        colorAnalysis: (latestResult.value.data.color_analysis as MobileColorAnalysis | null) ?? null,
        faceShape: (latestResult.value.data.face_shape as MobileFaceShape | null) ?? null,
        skinAnalysis: (latestResult.value.data.skin_analysis as MobileSkinAnalysis | null) ?? null,
        hairstyle: (latestResult.value.data.hairstyle as MobileHairstyle | null) ?? null,
      }
    : null;

  const totalReports = countResult.status === "fulfilled" ? countResult.value.count ?? 0 : 0;

  return { totalReports, prefs, latest };
}

export async function fetchProgressReports(): Promise<MobileProgressReport[]> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("reports")
    .select("id, created_at, color_analysis, face_shape, skin_analysis, is_paid, status")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (rows ?? []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    colorAnalysis: (row.color_analysis as MobileColorAnalysis | null) ?? null,
    faceShape: (row.face_shape as MobileFaceShape | null) ?? null,
    skinAnalysis: (row.skin_analysis as MobileSkinAnalysis | null) ?? null,
    isPaid: Boolean(row.is_paid),
    status: row.status as string,
  }));
}
