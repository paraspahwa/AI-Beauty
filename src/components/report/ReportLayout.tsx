"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Sparkles, Lock, Loader2, Wand2, BarChart2, X } from "lucide-react";
import { FaceFeaturesCard } from "./FaceFeaturesCard";
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
import { StyleChatDrawer } from "@/components/StyleChatDrawer";
import type { CompiledReport } from "@/types/report";
import { fadeUp, staggerContainer, tabContent } from "@/lib/animations";

const TABS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "face",      label: "Face" },
  { value: "skin",      label: "Skin" },
  { value: "hair",      label: "Hairstyle" },
  { value: "glasses",   label: "Spectacles" },
  ...(publicEnv.flags.doAvoidModule ? [{ value: "style", label: "Do & Avoid Guide" }] : []),
  { value: "shop",      label: "Shop" },
  { value: "jewellery", label: "Jewellery" },
];

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
  initialTab = "face",
  initialStudioSourceAssetId = null,
  appReturnToUrl = null,
  initialPaywallOpen = false,
  initialPaywallPlan = "report",
}: Props) {
  const [report, setReport] = React.useState(initial);
  const [activeTab, setActiveTab] = React.useState<string>(initialTab);
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
  const [activeMode, setActiveMode] = React.useState<"report" | "studio">(initialTab === "studio" ? "studio" : "report");
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
  const isProcessing = report.status === "processing" || report.status === "pending";
  const isStudioView = activeMode === "studio";

  const setModeAndSyncUrl = React.useCallback((mode: "report" | "studio") => {
    setActiveMode(mode);

    const params = new URLSearchParams(searchParams.toString());
    if (mode === "studio") params.set("tab", "studio");
    else if (params.get("tab") === "studio") params.delete("tab");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const headerEyebrow = isStudioView ? "✦ Your Renovaara Studio ✦" : "✦ Your Renovaara Report ✦";
  const headerTitle = isStudioView
    ? report.colorAnalysis?.season
      ? `${report.colorAnalysis.season} Studio Session`
      : "AI Beauty Studio"
    : report.colorAnalysis?.season
      ? `Your ${report.colorAnalysis.season} Beauty Profile`
      : "Personal Beauty Profile";
  const headerDescription = isStudioView
    ? "Try looks on your own photo first. Switch back to the report when you want the detailed why behind each recommendation."
    : report.summary;

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
    if (activeMode !== "report" || activeTab !== "style" || !publicEnv.flags.doAvoidModule || isReadOnly || !isPaid) return;

    const requestKey = `${report.id}:style-outfit-history`;
    if (outfitHistoryRequested.current.has(requestKey)) return;
    outfitHistoryRequested.current.add(requestKey);
    void loadOutfitHistory();
  }, [activeMode, activeTab, isPaid, isReadOnly, loadOutfitHistory, report.id]);

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

        {/* ── Top-level mode switcher ── */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex rounded-2xl p-1 gap-1" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", boxShadow: "0 4px 16px rgba(61,43,31,0.08)" }}>
            <button
              onClick={() => {
                if (!isPaid) { setPaywallOpen(true); return; }
                setModeAndSyncUrl("studio");
              }}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
              style={activeMode === "studio"
                ? { background: "#111827", color: "#fff", boxShadow: "0 2px 8px rgba(17,24,39,0.25)" }
                : { color: "#5C4232" }}
            >
              <Wand2 className="h-4 w-4" />
              AI Studio
              {isStudioPro ? (
                <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: activeMode === "studio" ? "rgba(255,255,255,0.25)" : "rgba(17,24,39,0.15)", color: activeMode === "studio" ? "#fff" : "#111827" }}>PRO</span>
              ) : (
                <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: activeMode === "studio" ? "rgba(255,255,255,0.18)" : "rgba(17,24,39,0.15)", color: activeMode === "studio" ? "rgba(255,255,255,0.85)" : "#C8A96E" }}>↑ Try</span>
              )}
            </button>
            <button
              onClick={() => setModeAndSyncUrl("report")}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
              style={activeMode === "report"
                ? { background: "#111827", color: "#fff", boxShadow: "0 2px 8px rgba(17,24,39,0.25)" }
                : { color: "#5C4232" }}
            >
              <BarChart2 className="h-4 w-4" />
              Analysis Report
            </button>
          </div>
        </div>

        {/* ── Analysis Report Mode ── */}
        {activeMode === "report" && (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="relative mb-8">
            <div className="overflow-x-auto -mx-4 sm:mx-0 [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-start md:justify-center px-4 sm:px-0">
            <TabsList
              className="backdrop-blur-sm rounded-2xl p-1.5 gap-1 flex-nowrap"
              style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", boxShadow: "0 4px 16px rgba(61,43,31,0.08)" }}
            >
              {TABS.map((t) => {
                const isLocked =
                  !isPaid && (t.value === "skin" || t.value === "glasses" || t.value === "hair" || t.value === "shop" || t.value === "jewellery" || t.value === "style");

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
            <TabsContent value="face" className="mt-0">
              {activeTab === "face" && (
                <motion.div
                  key="face"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {report.faceShape && report.features ? (
                    <FaceFeaturesCard
                      faceShape={report.faceShape}
                      features={report.features}
                      blendedConfidence={report.pipelineMeta?.blendedConfidence}
                      photoUrl={report.imageUrl}
                    />
                  ) : (
                    <Empty />
                  )}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="skin" className="mt-0">
              {activeTab === "skin" && (
                <motion.div
                  key="skin"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {!isPaid ? (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      initialPaywallPlan={initialPaywallPlan}
                      title="Skin Analysis"
                    />
                  ) : report.skinAnalysis ? (
                    <>
                      <SkinAnalysisCard
                        data={report.skinAnalysis}
                        photoUrl={report.imageUrl}
                      />
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
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="glasses" className="mt-0">
              {activeTab === "glasses" && (
                <motion.div
                  key="glasses"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {!isPaid ? (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      initialPaywallPlan={initialPaywallPlan}
                      title="Spectacles Guide"
                    />
                  ) : report.glasses ? (
                    <SpectaclesCard
                      data={report.glasses}
                      photoUrl={report.imageUrl}
                      previewSlots={report.visualAssets?.assets?.glassesPreviews}
                      reportId={report.id}
                      onRefresh={refresh}
                      faceShape={report.faceShape?.shape}
                      faceTraits={report.faceShape?.traits}
                    />
                  ) : (
                    <Empty />
                  )}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="hair" className="mt-0">
              {activeTab === "hair" && (
                <motion.div
                  key="hair"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {!isPaid ? (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      initialPaywallPlan={initialPaywallPlan}
                      title="Hairstyle Guide"
                    />
                  ) : report.hairstyle ? (
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
                  ) : (
                    <Empty />
                  )}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="shop" className="mt-0">
              {activeTab === "shop" && (
                <motion.div
                  key="shop"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {isPaid ? (
                    <ShoppingGuideCard report={report} />
                  ) : (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      initialPaywallPlan={initialPaywallPlan}
                      title="Shop Your Look"
                    />
                  )}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="jewellery" className="mt-0">
              {activeTab === "jewellery" && (
                <motion.div
                  key="jewellery"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {report.faceShape && report.colorAnalysis ? (
                    <JewelleryCard
                      faceShape={report.faceShape}
                      colorAnalysis={report.colorAnalysis}
                      isPaid={isPaid}
                    />
                  ) : (
                    <div className="py-12 text-center text-sm text-pink-700/50">
                      Complete your analysis to unlock jewellery recommendations.
                    </div>
                  )}
                </motion.div>
              )}
            </TabsContent>

            {publicEnv.flags.doAvoidModule && (
              <TabsContent value="style" className="mt-0">
                {activeTab === "style" && (
                  <motion.div
                    key="style"
                    variants={tabContent}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {!isPaid ? (
                      <Locked
                        reportId={report.id}
                        onUnlocked={refresh}
                        initialPaywallPlan={initialPaywallPlan}
                        title="Personalized style guide"
                      />
                    ) : (
                      <div className="mb-6 rounded-3xl p-5" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>Personalized outfit recommendations</p>
                            <p className="text-xs" style={{ color: "#9C7D5B" }}>
                              Generate looks using your report palette, face profile, and seasonal style direction.
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Occasion</span>
                              <select
                                value={outfitOccasion}
                                onChange={(event) => setOutfitOccasion(event.target.value as OutfitOccasion)}
                                className="rounded-xl px-3 py-2 text-sm"
                                style={{ background: "#F5EFE7", border: "1px solid #E8DDD0", color: "#3D2B1F" }}
                              >
                                {STYLE_OCCASIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Vibe</span>
                              <select
                                value={outfitVibe}
                                onChange={(event) => setOutfitVibe(event.target.value as OutfitVibe)}
                                className="rounded-xl px-3 py-2 text-sm"
                                style={{ background: "#F5EFE7", border: "1px solid #E8DDD0", color: "#3D2B1F" }}
                              >
                                {STYLE_VIBES.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => void generateOutfitRecommendations()}
                              disabled={outfitLoading}
                              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                              style={{ background: "#111827", color: "#fff" }}
                            >
                              {outfitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                              {outfitLoading ? "Generating..." : "Generate outfit ideas"}
                            </button>
                            {outfitHistoryLoading ? (
                              <span className="inline-flex items-center gap-2 text-xs" style={{ color: "#9C7D5B" }}>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading your previous outfit sessions...
                              </span>
                            ) : null}
                          </div>
                          {outfitError ? (
                            <p className="text-xs" style={{ color: "#C06B3E" }}>{outfitError}</p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {isPaid && outfitHistory.length > 0 ? (
                      <div className="mb-6 rounded-2xl p-4" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9C7D5B" }}>Recent outfit sessions</p>
                        <div className="flex flex-wrap gap-2">
                          {outfitHistory.slice(0, 6).map((session) => (
                            <button
                              key={session.id}
                              onClick={() => setOutfitLooks(session.looks)}
                              className="rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-85"
                              style={{ background: "rgba(17,24,39,0.08)", color: "#3D2B1F", border: "1px solid rgba(17,24,39,0.15)" }}
                            >
                              {session.occasion} • {session.vibe}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {isPaid && outfitLooks.length > 0 ? (
                      <div className="mb-6 grid gap-4 md:grid-cols-2">
                        {outfitLooks.map((look, index) => (
                          <div key={`${look.title}-${index}`} className="rounded-3xl p-5" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
                            <h4 className="text-base font-semibold" style={{ color: "#3D2B1F" }}>{look.title}</h4>
                            <p className="mt-2 text-xs" style={{ color: "#9C7D5B" }}>{look.occasion} • {look.vibe}</p>
                            <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "#6B5344" }}>
                              {look.pieces.map((piece) => (
                                <li key={`${look.title}-${piece}`}>• {piece}</li>
                              ))}
                            </ul>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {look.accentColors.map((color) => (
                                <span key={`${look.title}-${color.hex}`} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]" style={{ background: "rgba(17,24,39,0.08)", color: "#3D2B1F" }}>
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color.hex, border: "1px solid rgba(0,0,0,0.2)" }} />
                                  {color.name}
                                </span>
                              ))}
                            </div>
                            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#6B5344" }}>{look.whyItWorks}</p>
                            <p className="mt-2 text-xs" style={{ color: "#9C7D5B" }}>Suggested metal: {look.metal}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {isPaid && outfitHistory[0] ? (
                      <div className="mb-6 rounded-2xl p-4" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9C7D5B" }}>Session feedback</p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            ["liked", "Liked"],
                            ["saved", "Saved"],
                            ["worn", "Worn"],
                          ] as const).map(([field, label]) => {
                            const active = Boolean(outfitHistory[0].feedback?.[field]);
                            return (
                              <button
                                key={field}
                                onClick={() => void toggleOutfitFeedback(outfitHistory[0].id, field)}
                                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                                style={active
                                  ? { background: "#111827", color: "#fff" }
                                  : { background: "rgba(17,24,39,0.08)", color: "#3D2B1F", border: "1px solid rgba(17,24,39,0.15)" }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-6 md:grid-cols-3">
                      {(guidanceData as DoAvoidGuidanceConfig).map((block) => (
                        <DoAvoidGuidanceCard key={block.category} block={block} location="report" />
                      ))}
                    </div>
                  </motion.div>
                )}
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
        )}

        {/* ── AI Studio Mode ── */}
        {activeMode === "studio" && (
          <motion.div
            key="studio-mode"
            variants={tabContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <AIBeautyStudio
              reportId={report.id}
              photoUrl={report.imageUrl}
              isPaid={isPaid}
              detectedGender={report.detectedGender}
              studioEntitlement={report.studioEntitlement}
              colorAnalysis={report.colorAnalysis}
              initialSourceAssetId={initialStudioSourceAssetId}
            />
          </motion.div>
        )}

      </motion.div>

      {/* Sticky upgrade bar — shown to unpaid owners only */}
      {!isReadOnly && !isPaid && !paymentInitiated && (
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

      {/* Style Consultant Chat — only for the authenticated owner (paid, to avoid FAB + sticky bar conflict) */}
      {!isReadOnly && isPaid && <StyleChatDrawer reportId={report.id} report={report} />}
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

