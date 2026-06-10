"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Sparkles, Lock, Loader2, X } from "lucide-react";
import { FaceFeaturesCard } from "./FaceFeaturesCard";
import { FreePreviewTeaser } from "./FreePreviewTeaser";
import { AIBeautyStudio } from "./AIBeautyStudio";
import { SkinAnalysisCard } from "./SkinAnalysisCard";
import { IngredientAnalyzer } from "@/components/IngredientAnalyzer";
import { ProductComparisonCard } from "@/components/ProductComparisonCard";
import { SpectaclesCard } from "./SpectaclesCard";
import { HairstyleCard } from "./HairstyleCard";
import { ShoppingGuideCard } from "./ShoppingGuideCard";
import { JewelleryCard } from "./JewelleryCard";
import { DoAvoidGuidanceCard } from "@/components/ui/DoAvoidGuidanceCard";
import type { DoAvoidGuidanceConfig } from "@/types/doAvoidGuidance";
import guidanceData from "@/content/do-avoid-guidance.json";
import { publicEnv } from "@/lib/public-env";
import { Paywall } from "@/components/Paywall";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import { PRODUCT_COPY, STUDIO_EXPERIENCES } from "@/lib/product-copy";
import { StyleChatDrawer } from "@/components/StyleChatDrawer";
import type { CompiledReport } from "@/types/report";
import { fadeUp, staggerContainer, tabContent } from "@/lib/animations";

const TABS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "about-you", label: "About You" },
  { value: "your-look", label: "Your Look" },
  { value: "try-shop",  label: "Try & Shop" },
];

const LEGACY_TAB_MAP: Record<string, string> = {
  face: "about-you",
  skin: "about-you",
  hair: "your-look",
  glasses: "your-look",
  jewellery: "your-look",
  style: "your-look",
  shop: "try-shop",
  studio: "try-shop",
};

function normalizeReportTab(tab: string): string {
  return LEGACY_TAB_MAP[tab] ?? (TABS.some((t) => t.value === tab) ? tab : "about-you");
}

type OutfitOccasion = "casual" | "work" | "date" | "wedding" | "travel";
type OutfitVibe = "minimal" | "classic" | "bold" | "romantic" | "street";

type OutfitLook = {
  title: string;
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
  pieces: string[];
  accentColors: { name: string; hex: string }[];
  metal: string;
  whyItWorks: string;
};

type OutfitSession = {
  id: string;
  createdAt: string;
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
  season: string;
  undertone: string;
  looks: OutfitLook[];
  feedback?: {
    liked: boolean;
    saved: boolean;
    worn: boolean;
  };
};

const STYLE_OCCASIONS: OutfitOccasion[] = ["casual", "work", "date", "wedding", "travel"];
const STYLE_VIBES: OutfitVibe[] = ["minimal", "classic", "bold", "romantic", "street"];

interface Props {
  report: CompiledReport;
  /** True on the public /r/[token] page — disables auth-gated features */
  isReadOnly?: boolean;
  initialTab?: string;
  initialStudioSourceAssetId?: string | null;
  appReturnToUrl?: string | null;
  initialPaywallOpen?: boolean;
  initialPaywallPlan?: "report" | "studio_pro";
}

export function ReportLayout({
  report: initial,
  isReadOnly = false,
  initialTab = "about-you",
  initialStudioSourceAssetId = null,
  appReturnToUrl = null,
  initialPaywallOpen = false,
  initialPaywallPlan = "report",
}: Props) {
  const [report, setReport] = React.useState(initial);
  const [activeTab, setActiveTab] = React.useState<string>(normalizeReportTab(initialTab));
  const handleTabChange = (value: string) => setActiveTab(value);
  const [copied, setCopied] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [shareToken, setShareToken] = React.useState<string | null>(initial.shareToken ?? null);
  const [visualsLoading, setVisualsLoading] = React.useState(false);
  const [visualsFailed, setVisualsFailed] = React.useState(false);
  const [hairstyleBestLoading, setHairstyleBestLoading] = React.useState(false);
  const [paymentInitiated, setPaymentInitiated] = React.useState(false);
  const [paywallOpen, setPaywallOpen] = React.useState(initialPaywallOpen);
  const [outfitOccasion, setOutfitOccasion] = React.useState<OutfitOccasion>("casual");
  const [outfitVibe, setOutfitVibe] = React.useState<OutfitVibe>("minimal");
  const [outfitLooks, setOutfitLooks] = React.useState<OutfitLook[]>([]);
  const [outfitHistory, setOutfitHistory] = React.useState<OutfitSession[]>([]);
  const [outfitHistoryLoading, setOutfitHistoryLoading] = React.useState(false);
  const [outfitLoading, setOutfitLoading] = React.useState(false);
  const [outfitError, setOutfitError] = React.useState<string | null>(null);
  const hairstyleBestRequested = React.useRef<Set<string>>(new Set());
  const outfitHistoryRequested = React.useRef<Set<string>>(new Set());
  const isPaid = report.isPaid;
  const isStudioPro = report.studioEntitlement?.tier === "studio_pro";
  const freeTryOnsRemaining = !isPaid
    ? (report.studioEntitlement?.remainingGens ?? PRODUCT_COPY.free.studioGensPerMonth)
    : 0;
  const hideStickyBar = !isPaid && activeTab === "try-shop" && freeTryOnsRemaining > 0;
  const isProcessing = report.status === "processing" || report.status === "pending";
  const headerEyebrow = "✦ Your Renovaara Report ✦";
  const headerTitle = report.colorAnalysis?.season
    ? `Your ${report.colorAnalysis.season} Beauty Profile`
    : "Personal Beauty Profile";
  const headerDescription = report.summary;

  const refresh = React.useCallback(async () => {
    const res = await fetch(`/api/reports/${report.id}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
  }, [report.id]);

  const loadOutfitHistory = React.useCallback(async () => {
    if (isReadOnly || !isPaid || !publicEnv.flags.doAvoidModule) return;
    setOutfitHistoryLoading(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/outfit-generator`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load outfit history");
      const json = (await res.json()) as { history?: OutfitSession[] };
      const history = json.history ?? [];
      setOutfitHistory(history);
      if (history.length > 0) {
        setOutfitLooks(history[0].looks);
      }
    } catch {
      setOutfitError("Unable to load outfit history right now.");
    } finally {
      setOutfitHistoryLoading(false);
    }
  }, [isPaid, isReadOnly, report.id]);

  const triggerVisuals = React.useCallback(async () => {
    setVisualsLoading(true);
    setVisualsFailed(false);
    try {
      // Fast path: generates palette board + landmark overlay only (no Replicate).
      const res = await fetch(`/api/reports/${report.id}/visuals`, { method: "POST" });
      if (!res.ok) { setVisualsFailed(true); return; }
      await refresh();
    } catch {
      setVisualsFailed(true);
    } finally {
      setVisualsLoading(false);
    }
  }, [report.id, refresh]);

  // Poll while the report is still processing
  React.useEffect(() => {
    if (isReadOnly || !isProcessing) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [isProcessing, report.id, isReadOnly, refresh]);

  // Per-slot generating state: Set of slot indices (0-11) currently in-flight.
  const [generatingSlots, setGeneratingSlots] = React.useState<Set<number>>(new Set());
  // colorsGenerating is true when ANY slot is generating (drives banner)
  const colorsGenerating = generatingSlots.size > 0;

  // When the report is ready but palette/landmark visuals haven't been generated yet,
  // trigger ONLY the fast non-Replicate visuals route (palette board + landmark overlay).
  // Color swatches are now click-to-generate (per-slot) — no auto-fire on load.
  React.useEffect(() => {
    if (isReadOnly || report.status !== "ready") return;
    if (visualsLoading) return;
    const hasVisuals = !!report.visualAssets?.assets?.paletteBoard;
    if (!hasVisuals) {
      triggerVisuals();
    }
  }, [report.status, report.id, isReadOnly, visualsLoading, report.visualAssets?.assets?.paletteBoard, triggerVisuals]);

  // Poll while any slot is actively generating.
  // Use 4s when the tab is visible (user is watching), 10s when backgrounded.
  // This cuts worst-case perceived wait from 23s → ~19s for tab-visible users.
  React.useEffect(() => {
    if (generatingSlots.size === 0) return;
    const cadence = document.visibilityState === "visible" ? 4000 : 10000;
    const timer = setInterval(refresh, cadence);
    return () => clearInterval(timer);
  }, [generatingSlots.size, refresh]);

  // Ensure the top hairstyle recommendation has an AI preview when the hairstyle tab is opened.
  React.useEffect(() => {
    if (isReadOnly || activeTab !== "hair" || !isPaid || !report.hairstyle) return;

    const slotZero = report.visualAssets?.assets?.hairstylePreviews?.[0];
    if (slotZero?.status === "ready" || slotZero?.status === "pending" || slotZero?.status === "failed") return;
    if (hairstyleBestLoading) return;

    const requestKey = `${report.id}:hair-best`;
    if (hairstyleBestRequested.current.has(requestKey)) return;
    hairstyleBestRequested.current.add(requestKey);

    let cancelled = false;
    (async () => {
      setHairstyleBestLoading(true);
      try {
        const res = await fetch(`/api/reports/${report.id}/visuals?type=hairstyle&index=0`, { method: "POST" });
        if (!cancelled && res.ok) {
          await refresh();
        }
      } catch {
        /* non-blocking: fallback to selfie if preview generation fails */
      } finally {
        if (!cancelled) setHairstyleBestLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, isPaid, isReadOnly, report.hairstyle, report.id, report.visualAssets, hairstyleBestLoading, refresh]);

  React.useEffect(() => {
    if (activeTab !== "your-look" || !publicEnv.flags.doAvoidModule || isReadOnly || !isPaid) return;

    const requestKey = `${report.id}:style-outfit-history`;
    if (outfitHistoryRequested.current.has(requestKey)) return;
    outfitHistoryRequested.current.add(requestKey);
    void loadOutfitHistory();
  }, [activeTab, isPaid, isReadOnly, loadOutfitHistory, report.id]);

  async function generateOutfitRecommendations() {
    setOutfitLoading(true);
    setOutfitError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/outfit-generator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: outfitOccasion, vibe: outfitVibe }),
      });
      const json = (await res.json()) as {
        looks?: OutfitLook[];
        history?: OutfitSession[];
        error?: string;
      };
      if (!res.ok || !json.looks || json.looks.length === 0) {
        throw new Error(json.error ?? "Could not generate outfits right now.");
      }
      setOutfitLooks(json.looks);
      if (json.history) {
        setOutfitHistory(json.history);
      }
    } catch (err) {
      setOutfitError((err as Error).message || "Could not generate outfits right now.");
      setOutfitLooks([]);
    } finally {
      setOutfitLoading(false);
    }
  }

  async function toggleOutfitFeedback(sessionId: string, field: "liked" | "saved" | "worn", value?: boolean) {
    const previous = outfitHistory;
    const optimistic = outfitHistory.map((session) => {
      if (session.id !== sessionId) return session;
      const current = {
        liked: session.feedback?.liked ?? false,
        saved: session.feedback?.saved ?? false,
        worn: session.feedback?.worn ?? false,
      };
      return {
        ...session,
        feedback: {
          ...current,
          [field]: typeof value === "boolean" ? value : !current[field],
        },
      };
    });
    setOutfitHistory(optimistic);

    try {
      const res = await fetch(`/api/reports/${report.id}/outfit-generator`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, field, value }),
      });
      const json = (await res.json()) as { history?: OutfitSession[] };
      if (!res.ok) throw new Error("Failed to update outfit feedback");
      if (json.history) setOutfitHistory(json.history);
    } catch {
      setOutfitHistory(previous);
    }
  }

  /** Generate a single color swatch slot on user click. */
  async function generateSwatchSlot(slot: number) {
    if (generatingSlots.has(slot)) return; // already running
    // Check if already ready
    const existing = report.visualAssets?.assets?.colorSwatchPreviews?.[slot];
    if (existing?.status === "ready") return;

    setGeneratingSlots((prev) => new Set(prev).add(slot));
    try {
      await fetch(`/api/reports/${report.id}/visuals/colors?slot=${slot}`, { method: "POST" });
      await refresh();
    } catch {
      /* slot stays as color circle — no crash */
    } finally {
      setGeneratingSlots((prev) => {
        const next = new Set(prev);
        next.delete(slot);
        return next;
      });
    }
  }


  async function share() {
    setShareLoading(true);
    try {
      let token = shareToken;
      if (!token) {
        const res = await fetch(`/api/reports/${report.id}/share`, { method: "POST" });
        if (res.ok) {
          const data = await res.json() as { shareToken: string; shareUrl: string };
          token = data.shareToken;
          setShareToken(token);
        }
      }
      const url = token
        ? `${window.location.origin}/r/${token}`
        : `${window.location.origin}/report/${report.id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* user cancelled / clipboard unavailable */
    } finally {
      setShareLoading(false);
    }
  }

  async function revokeShare() {
    await fetch(`/api/reports/${report.id}/share`, { method: "DELETE" });
    setShareToken(null);
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5EFE7", borderTop: "4px solid transparent", borderImage: "#111827 1" }}>
    <div className="container max-w-5xl py-10 sm:py-14">
      <motion.header
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mb-10 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-[10px] uppercase tracking-[0.35em] font-semibold"
          style={{ color: "#C8A96E" }}
        >
          {headerEyebrow}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-3 font-sans text-4xl sm:text-5xl"
          style={{ color: "#3D2B1F" }}
        >
          {headerTitle}
        </motion.h1>
        {headerDescription && (
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed"
            style={{ color: "#6B5344" }}
          >
            {headerDescription}
          </motion.p>
        )}
        {/* Visuals generating banner — shown while color swatches are being created */}
        {visualsLoading && (
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm"
            style={{
              background: "rgba(200,169,110,0.12)",
              border: "1px solid rgba(200,169,110,0.35)",
              color: "#9C7D5B",
            }}
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>Generating your color previews — this takes ~60 seconds…</span>
          </motion.div>
        )}
        {/* Visuals failed banner */}
        {visualsFailed && !visualsLoading && (
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm"
            style={{
              background: "rgba(192,107,62,0.1)",
              border: "1px solid rgba(192,107,62,0.3)",
              color: "#C06B3E",
            }}
          >
            <span>Color previews failed to generate.</span>
            <button
              onClick={triggerVisuals}
              className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ background: "rgba(192,107,62,0.15)", color: "#C06B3E" }}
            >
              Retry
            </button>
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={share}
                disabled={shareLoading}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", color: "#3D2B1F", boxShadow: "0 2px 8px rgba(61,43,31,0.08)" }}
              >
                {shareLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Share2 className="h-4 w-4" style={{ color: "#9C7D5B" }} />}
                {copied ? "Copied ✨" : shareToken ? "Copy public link" : "Share"}
              </button>
              {shareToken && !copied && (
                <button
                  onClick={revokeShare}
                  title="Revoke public link"
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-80"
                  style={{ background: "rgba(192,107,62,0.1)", color: "#C06B3E", border: "1px solid rgba(192,107,62,0.25)" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {!isReadOnly && isPaid ? (
            <a
              href={`/api/reports/${report.id}/pdf`}
              download={`Renovaara-report-${report.id}.html`}
              rel="noopener"
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#111827", color: "#fff", boxShadow: "0 2px 12px rgba(17,24,39,0.35)" }}
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          ) : !isReadOnly && (
            <Paywall
              reportId={report.id}
              appReturnToUrl={appReturnToUrl ?? undefined}
              initialPlan={initialPaywallPlan}
              externalOpen={paywallOpen}
              onExternalOpenChange={setPaywallOpen}
              onUnlocked={() => { setPaymentInitiated(true); setPaywallOpen(false); refresh(); }}
              onSubscribed={() => { setPaywallOpen(false); router.push("/success?type=studio_pro"); }}
            />
          )}
        </motion.div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Payment-initiated bridge state — shown between Razorpay success and webhook confirmation */}
        {paymentInitiated && !isPaid && (
          <div className="mb-8 flex flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center" style={{ background: "rgba(17,24,39,0.06)", border: "1px solid rgba(17,24,39,0.2)" }}>
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#111827" }} />
            <p className="text-base font-semibold" style={{ color: "#111827" }}>Payment received — unlocking your report…</p>
            <p className="text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>This takes 5–15 seconds. Hang tight!</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="relative mb-8">
            <div className="overflow-x-auto -mx-4 sm:mx-0 [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-start md:justify-center px-4 sm:px-0">
            <TabsList
              className="backdrop-blur-sm rounded-2xl p-1.5 gap-1 flex-nowrap"
              style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", boxShadow: "0 4px 16px rgba(61,43,31,0.08)" }}
            >
              {TABS.map((t) => {
                const isLocked = !isPaid && t.value !== "about-you" && t.value !== "try-shop";

                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="relative rounded-xl text-[13px] font-medium px-3 py-2 sm:px-4 transition-all data-[state=active]:shadow-sm whitespace-nowrap"
                    style={activeTab === t.value
                      ? { background: "#111827", color: "#fff" }
                      : { color: "#5C4232" }}
                  >
                    {isLocked && (
                      <Lock className="h-3 w-3 mr-1.5 animate-pulse-slow" style={{ color: "#C8A96E" }} />
                    )}
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            </div>
            </div>
            {/* Right-side fade — visual hint that more tabs are hidden on mobile */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-12 sm:hidden"
              style={{ background: "linear-gradient(to left, #FDFAF6 0%, transparent 100%)" }}
            />
          </div>

          <AnimatePresence mode="wait">
            <TabsContent value="about-you" className="mt-0">
              {activeTab === "about-you" && (
                <motion.div
                  key="about-you"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {report.faceShape ? (
                    <FaceFeaturesCard
                      faceShape={report.faceShape}
                      features={report.features}
                      blendedConfidence={report.pipelineMeta?.blendedConfidence}
                      photoUrl={report.imageUrl}
                      previewOnly={!report.features}
                    />
                  ) : (
                    <Empty />
                  )}
                  {!isPaid ? (
                    <>
                      <UnlockTeaserBanner
                        hints={{
                          season: report.colorAnalysis?.season,
                          faceShape: report.faceShape?.shape,
                        }}
                      />
                      <FreePreviewTeaser
                        colorAnalysis={report.colorAnalysis}
                        summary={report.summary}
                        teaserOnly
                      />
                    </>
                  ) : null}
                  <div className="mt-8">
                    {!isPaid ? (
                      <Locked
                        reportId={report.id}
                        onUnlocked={refresh}
                        initialPaywallPlan={initialPaywallPlan}
                        title="Skin Analysis"
                      />
                    ) : report.skinAnalysis ? (
                      <>
                        <SkinAnalysisCard data={report.skinAnalysis} photoUrl={report.imageUrl} />
                        <IngredientAnalyzer
                          skinContext={{
                            type: report.skinAnalysis.type,
                            concerns: report.skinAnalysis.concerns.map((c) => c.label),
                          }}
                        />
                        <ProductComparisonCard
                          skinContext={{
                            type: report.skinAnalysis.type,
                            concerns: report.skinAnalysis.concerns.map((c) => c.label),
                          }}
                        />
                      </>
                    ) : (
                      <Empty />
                    )}
                  </div>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="your-look" className="mt-0">
              {activeTab === "your-look" && (
                <motion.div
                  key="your-look"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  {!isPaid ? (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      initialPaywallPlan={initialPaywallPlan}
                      title="Your Look Guide"
                    />
                  ) : (
                    <>
                      {report.hairstyle ? (
                        <HairstyleCard
                          data={report.hairstyle}
                          photoUrl={report.imageUrl}
                          previewSlots={report.visualAssets?.assets?.hairstylePreviews}
                          reportId={report.id}
                          onRefresh={refresh}
                          faceShape={report.faceShape?.shape}
                          faceTraits={report.faceShape?.traits}
                          bestFeatures={
                            report.features
                              ? [
                                  report.features.eyes.shape,
                                  report.features.cheeks.shape,
                                  report.features.lips.shape,
                                ]
                              : undefined
                          }
                          stylingTips={report.hairstyle.stylingTips}
                          hairType={report.hairstyle.hairType}
                        />
                      ) : null}
                      {report.glasses ? (
                        <SpectaclesCard
                          data={report.glasses}
                          photoUrl={report.imageUrl}
                          previewSlots={report.visualAssets?.assets?.glassesPreviews}
                          reportId={report.id}
                          onRefresh={refresh}
                          faceShape={report.faceShape?.shape}
                          faceTraits={report.faceShape?.traits}
                        />
                      ) : null}
                      {report.faceShape && report.colorAnalysis ? (
                        <JewelleryCard
                          faceShape={report.faceShape}
                          colorAnalysis={report.colorAnalysis}
                          isPaid={isPaid}
                        />
                      ) : null}
                      {publicEnv.flags.doAvoidModule ? (
                        <div className="grid gap-6 md:grid-cols-3">
                          {(guidanceData as DoAvoidGuidanceConfig).map((block) => (
                            <DoAvoidGuidanceCard key={block.category} block={block} location="report" />
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="try-shop" className="mt-0">
              {activeTab === "try-shop" && (
                <motion.div
                  key="try-shop"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  {isReadOnly && activeTab === "try-shop" && (() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7426/ingest/c98621ce-d232-4690-a505-eaf5b197033b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6b59e2'},body:JSON.stringify({sessionId:'6b59e2',location:'ReportLayout.tsx:try-shop',message:'read-only share try-shop',data:{isReadOnly,isPaid},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                    return null;
                  })()}
                  {!isReadOnly && (
                    <>
                      <UnlockTeaserBanner
                        hints={{
                          season: report.colorAnalysis?.season,
                          faceShape: report.faceShape?.shape,
                        }}
                      />
                      <div
                        className="rounded-2xl border px-4 py-3"
                        style={{ background: "rgba(17,24,39,0.04)", borderColor: "rgba(17,24,39,0.10)" }}
                      >
                        <p className="text-sm text-ink-stone">
                          {STUDIO_EXPERIENCES.reportTryOnStrip}{" "}
                          <Link href="/studio" className="font-medium text-ink underline hover:no-underline">
                            {STUDIO_EXPERIENCES.quickTry.name}
                          </Link>
                        </p>
                      </div>
                      <AIBeautyStudio
                        reportId={report.id}
                        photoUrl={report.imageUrl}
                        isPaid={isPaid}
                        detectedGender={report.detectedGender}
                        faceShape={report.faceShape?.shape}
                        studioEntitlement={report.studioEntitlement}
                        colorAnalysis={report.colorAnalysis}
                        initialSourceAssetId={initialStudioSourceAssetId}
                        presetFirst
                      />
                    </>
                  )}
                  {isReadOnly && (
                    <div
                      className="rounded-3xl border px-6 py-8 text-center"
                      style={{ background: "#FDFAF6", borderColor: "#E8DDD0" }}
                    >
                      <p className="text-base font-semibold text-ink">Try-on is available on your own report</p>
                      <p className="mt-2 text-sm text-ink-stone">
                        This shared preview shows analysis results only. Start your own {STUDIO_EXPERIENCES.quickTry.name} or get a full report to try looks on your selfie.
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <Link
                          href="/studio"
                          className="inline-flex rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white"
                        >
                          {STUDIO_EXPERIENCES.quickTry.cta}
                        </Link>
                        <Link
                          href="/upload"
                          className="inline-flex rounded-full border px-5 py-2 text-sm font-semibold text-ink"
                          style={{ borderColor: "#E8DDD0" }}
                        >
                          Get your own report
                        </Link>
                      </div>
                    </div>
                  )}
                  {!isReadOnly && isPaid ? (
                    <ShoppingGuideCard report={report} />
                  ) : !isReadOnly ? (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      initialPaywallPlan={initialPaywallPlan}
                      title="Shop Your Look"
                    />
                  ) : null}
                </motion.div>
              )}
            </TabsContent>

          </AnimatePresence>
        </Tabs>

      </motion.div>

      {/* Sticky upgrade bar — shown to unpaid owners only */}
      {!isReadOnly && !isPaid && !paymentInitiated && !hideStickyBar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
          style={{
            background: "#111827",
            boxShadow: "0 -4px 24px rgba(17,24,39,0.25)",
          }}
        >
          <p className="text-sm font-medium text-white">
            <span className="font-bold">Unlock your complete analysis</span>
            <span className="hidden sm:inline"> — skin routine, hairstyle guide, AI try-ons &amp; more</span>
          </p>
          <button
            onClick={() => setPaywallOpen(true)}
            className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold transition-opacity hover:opacity-90"
            style={{ color: "#111827" }}
          >
            Unlock now →
          </button>
        </div>
      )}

      {/* Style Consultant Chat — owner only; preview mode for unpaid */}
      {!isReadOnly && <StyleChatDrawer reportId={report.id} report={report} previewMode={!isPaid} />}
    </div>
    </div>
  );
}

function Empty() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl p-12 text-center"
      style={{ background: "#FDFAF6", border: "1px dashed #E8DDD0" }}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: "#C8B89A" }} />
      </motion.div>
      <p className="text-sm font-medium mb-1" style={{ color: "#3D2B1F" }}>Your analysis is on its way</p>
      <p className="text-xs" style={{ color: "#9C7D5B" }}>This page updates automatically — no need to refresh.</p>
    </motion.div>
  );
}

function Locked({
  title,
  reportId,
  onUnlocked,
  appReturnToUrl,
  initialPaywallPlan,
}: {
  title: string;
  reportId: string;
  onUnlocked: () => void;
  appReturnToUrl?: string | null;
  initialPaywallPlan?: "report" | "studio_pro";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-4xl p-12 sm:p-16 text-center relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(17,24,39,0.18)" }}
    >
      {/* Decorative background elements */}
      <motion.div
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl"
        style={{ background: "rgba(17,24,39,0.08)" }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl"
        style={{ background: "rgba(17,24,39,0.08)" }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mx-auto mb-6 relative"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full blur-xl"
            style={{ background: "rgba(17,24,39,0.25)" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center mx-auto rounded-full text-white shadow-glow" style={{ background: "#111827" }}>
            <Lock className="h-8 w-8" />
          </div>
        </motion.div>

        <h3 className="font-sans text-2xl sm:text-3xl text-ink mb-3">{title} is locked</h3>
        <p className="mx-auto max-w-md text-sm text-ink-stone leading-relaxed mb-8">
          Unlock the full report to see this section plus skin analysis, hairstyles, spectacles
          guide, and a downloadable PDF.
        </p>
        <div className="flex justify-center">
          <Paywall reportId={reportId} onUnlocked={onUnlocked} appReturnToUrl={appReturnToUrl ?? undefined} initialPlan={initialPaywallPlan} />
        </div>
      </div>
    </motion.div>
  );
}

