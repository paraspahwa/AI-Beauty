"use client";

import Link from "next/link";
import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { FaceFeaturesInfographic } from "./FaceFeaturesInfographic";
import { AnalysisSectionCard } from "./AnalysisSectionCard";
import { FreePreviewTeaser } from "./FreePreviewTeaser";
import { StyleGuideSection } from "./StyleGuideSection";
import { PdfDownloadShare } from "./PdfDownloadShare";
import { publicEnv } from "@/lib/public-env";
import { Paywall } from "@/components/Paywall";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import type { AnalysisInfographics, CompiledReport, ReportVisualAsset } from "@/types/report";
import { fadeUp, staggerContainer } from "@/lib/animations";

interface Props {
  report: CompiledReport;
  initialPaywallOpen?: boolean;
}

function infographicAssetMissing(asset?: ReportVisualAsset): boolean {
  return !asset || asset.status === "missing";
}

function infographicAssetPending(asset?: ReportVisualAsset): boolean {
  return !!asset && asset.status === "pending";
}

function pickFaceInfographic(
  isPaid: boolean,
  infographics?: AnalysisInfographics,
): ReportVisualAsset | undefined {
  const preview = infographics?.faceFeaturesPreview;
  const full = infographics?.faceFeatures;
  if (isPaid && full) {
    if (full.status === "ready" || full.status === "pending") return full;
    if (full.status === "failed" && preview) return preview;
  }
  return preview ?? full;
}

export function ReportLayout({ report: initial, initialPaywallOpen = false }: Props) {
  const [report, setReport] = React.useState(initial);
  const [paywallOpen, setPaywallOpen] = React.useState(initialPaywallOpen);
  const [paymentInitiated, setPaymentInitiated] = React.useState(false);

  const isPaid = report.isPaid;
  const isProcessing = report.status === "processing" || report.status === "pending";
  const infographics = report.visualAssets?.assets?.analysisInfographics;
  const faceInfographic = pickFaceInfographic(isPaid, infographics);
  const hairstyleInfographic = infographics?.hairstyle;
  const spectaclesInfographic = infographics?.spectacles;
  const colorInfographic = infographics?.color;
  const hairColorInfographic = infographics?.hairColor;
  const skinInfographic = infographics?.skin;
  const styleGuideInfographic = infographics?.styleGuide;
  const infographicPending =
    infographicAssetPending(faceInfographic) ||
    (isPaid && infographicAssetPending(infographics?.skin)) ||
    (isPaid && infographicAssetPending(infographics?.color)) ||
    (isPaid && infographicAssetPending(infographics?.hairstyle)) ||
    (isPaid && infographicAssetPending(infographics?.spectacles)) ||
    (isPaid && infographicAssetPending(infographics?.hairColor));
  const infographicMissing =
    infographicAssetMissing(infographics?.faceFeaturesPreview) ||
    (isPaid && infographicAssetMissing(infographics?.faceFeatures));
  const styleGuidePending =
    report.isStyleGuidePaid && infographicAssetPending(styleGuideInfographic);
  const headerTitle = report.colorAnalysis?.season
    ? `Your ${report.colorAnalysis.season} Beauty Profile`
    : "Personal Beauty Profile";

  const refresh = React.useCallback(async () => {
    const res = await fetch(`/api/reports/${report.id}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
  }, [report.id]);

  React.useEffect(() => {
    if (!isProcessing && !infographicPending && !styleGuidePending) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [isProcessing, infographicPending, styleGuidePending, refresh]);

  const ensureKickoffRef = React.useRef(false);
  React.useEffect(() => {
    if (isProcessing) return;
    if (!infographicMissing || ensureKickoffRef.current) return;
    ensureKickoffRef.current = true;
    void fetch(`/api/reports/${report.id}/ensure-infographics`, { method: "POST" }).catch(() => {
      ensureKickoffRef.current = false;
    });
  }, [isProcessing, infographicMissing, report.id]);

  return (
    <div className="min-h-app-viewport bg-[var(--color-background)]">
      <div className="page-bleed-x py-10 sm:py-14">
        <div className="mx-auto w-full max-w-4xl lg:max-w-5xl">
        <motion.header
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-10 text-center"
        >
          <motion.p variants={fadeUp} className="foil-label mb-3 justify-center">
            Your Renovaara Report
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-display text-3xl text-ink sm:text-4xl mb-3">
            {headerTitle}
          </motion.h1>
          {report.summary && (
            <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-sm text-ink-stone">
              {report.summary}
            </motion.p>
          )}
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-3">
            {isPaid && publicEnv.flags.pdfEnabled ? (
              <PdfDownloadShare
                reportId={report.id}
                variant="report"
                reportUrl={`${publicEnv.app.url.replace(/\/$/, "")}/report/${report.id}`}
                faceShape={report.faceShape?.shape}
                disabled={infographicPending}
              />
            ) : !isPaid ? (
              <Paywall
                reportId={report.id}
                externalOpen={paywallOpen}
                onExternalOpenChange={setPaywallOpen}
                onUnlocked={() => {
                  setPaymentInitiated(true);
                  setPaywallOpen(false);
                  refresh();
                }}
              />
            ) : null}
          </motion.div>
        </motion.header>

        {paymentInitiated && !isPaid && (
          <div className="dossier-card mb-8 flex flex-col items-center gap-3 text-center !py-6">
            <Loader2 className="h-7 w-7 animate-spin text-terracotta" />
            <p className="text-base font-semibold text-ink">Payment received — unlocking your report…</p>
          </div>
        )}

        <div className="space-y-8">
          {report.faceShape ? (
            <FaceFeaturesInfographic asset={faceInfographic} isPaid={isPaid} />
          ) : (
            <ProcessingCard />
          )}

          {!isPaid && (
            <>
              <UnlockTeaserBanner
                hints={{
                  season: report.colorAnalysis?.season,
                  faceShape: report.faceShape?.shape,
                }}
              />
              <FreePreviewTeaser colorAnalysis={report.colorAnalysis} summary={report.summary} teaserOnly />
            </>
          )}

          {isPaid ? (
            <>
              {report.skinAnalysis && (
                <AnalysisSectionCard
                  reportId={report.id}
                  section="skin"
                  chapterLabel="Chapter II"
                  title="Skin Analysis"
                  description="Your skin type, zones, and AM/PM routine — illustrated as a consultant-style board."
                  asset={skinInfographic}
                  onRefresh={refresh}
                />
              )}
              {report.colorAnalysis && (
                <AnalysisSectionCard
                  reportId={report.id}
                  section="color"
                  chapterLabel="Chapter III"
                  title="Color Analysis"
                  description="Seasonal palette, best colours, and metals matched to your undertone."
                  asset={colorInfographic}
                  onRefresh={refresh}
                />
              )}
              {report.hairstyle && (
                <AnalysisSectionCard
                  reportId={report.id}
                  section="hairstyle"
                  chapterLabel="Chapter IV"
                  title="Hairstyle Analysis"
                  description="Flattering cuts, lengths, and styling direction for your face shape."
                  asset={hairstyleInfographic}
                  onRefresh={refresh}
                />
              )}
              {report.hairstyle && report.colorAnalysis && (
                <AnalysisSectionCard
                  reportId={report.id}
                  section="hairColor"
                  chapterLabel="Chapter V"
                  title="Hair Color Analysis"
                  description="Shades that harmonise with your complexion — and tones to approach with care."
                  asset={hairColorInfographic}
                  onRefresh={refresh}
                />
              )}
              {report.glasses && (
                <AnalysisSectionCard
                  reportId={report.id}
                  section="spectacles"
                  chapterLabel="Chapter VI"
                  title="Spectacles Guide"
                  description="Frame shapes, colours, and fits that balance your features."
                  asset={spectaclesInfographic}
                  onRefresh={refresh}
                />
              )}
              <StyleGuideSection report={report} onRefresh={refresh} />
            </>
          ) : (
            <LockedSections reportId={report.id} onUnlocked={refresh} onOpenPaywall={() => setPaywallOpen(true)} />
          )}
        </div>

        {!isPaid && !paymentInitiated && (
          <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 bg-espresso px-4 py-3 shadow-xl sm:px-6">
            <p className="text-sm font-medium text-[var(--btn-fg)]">
              <span className="font-bold">Unlock your complete analysis</span>
            </p>
            <button
              onClick={() => setPaywallOpen(true)}
              className="shrink-0 rounded-full bg-terracotta px-4 py-1.5 text-sm font-bold text-[var(--btn-fg)]"
            >
              Unlock now →
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function ProcessingCard() {
  return (
    <div className="dossier-card rounded-3xl p-12 text-center border-dashed">
      <Sparkles className="mx-auto mb-3 h-10 w-10 animate-pulse text-terracotta" />
      <p className="text-sm font-medium text-ink">Your analysis is on its way</p>
    </div>
  );
}

function LockedSections({
  reportId,
  onUnlocked,
  onOpenPaywall,
}: {
  reportId: string;
  onUnlocked: () => void;
  onOpenPaywall: () => void;
}) {
  const sections = [
    "Skin Analysis",
    "Color Guide",
    "Hairstyle Guide",
    "Hair Color Guide",
    "Spectacles Guide",
  ];
  return (
    <div className="space-y-4">
      {sections.map((title) => (
        <div
          key={title}
          className="dossier-card rounded-3xl p-8 text-center"
        >
          <Lock className="mx-auto mb-3 h-8 w-8 text-rose-gold" />
          <p className="font-display font-semibold text-ink mb-2">{title}</p>
          <p className="text-sm text-ink-stone mb-4">Unlock the full report to view this section.</p>
          <Paywall reportId={reportId} onUnlocked={onUnlocked} />
        </div>
      ))}
    </div>
  );
}
