"use client";

import Link from "next/link";
import * as React from "react";
import { motion } from "framer-motion";
import { Download, Loader2, Lock, Sparkles } from "lucide-react";
import { FaceFeaturesCard } from "./FaceFeaturesCard";
import { FreePreviewTeaser } from "./FreePreviewTeaser";
import { SkinAnalysisCard } from "./SkinAnalysisCard";
import { ColorAnalysisCard } from "./ColorAnalysisCard";
import { HairstyleCard } from "./HairstyleCard";
import { SpectaclesCard } from "./SpectaclesCard";
import { HairColorCard } from "./HairColorCard";
import { StyleGuideCard } from "./StyleGuideCard";
import { publicEnv } from "@/lib/public-env";
import { Paywall } from "@/components/Paywall";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import type { CompiledReport } from "@/types/report";
import { fadeUp, staggerContainer } from "@/lib/animations";

interface Props {
  report: CompiledReport;
  initialPaywallOpen?: boolean;
}

export function ReportLayout({ report: initial, initialPaywallOpen = false }: Props) {
  const [report, setReport] = React.useState(initial);
  const [paywallOpen, setPaywallOpen] = React.useState(initialPaywallOpen);
  const [paymentInitiated, setPaymentInitiated] = React.useState(false);

  const isPaid = report.isPaid;
  const isProcessing = report.status === "processing" || report.status === "pending";
  const headerTitle = report.colorAnalysis?.season
    ? `Your ${report.colorAnalysis.season} Beauty Profile`
    : "Personal Beauty Profile";

  const refresh = React.useCallback(async () => {
    const res = await fetch(`/api/reports/${report.id}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
  }, [report.id]);

  React.useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [isProcessing, refresh]);

  return (
    <div className="min-h-app-viewport" style={{ background: "#F5F0EA" }}>
      <div className="page-bleed-x py-10 sm:py-14">
        <div className="mx-auto w-full max-w-4xl lg:max-w-5xl">
        <motion.header
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-10 text-center"
        >
          <motion.p variants={fadeUp} className="text-[10px] uppercase tracking-[0.35em] font-semibold mb-3" style={{ color: "#9C7D5B" }}>
            ✦ Your Renovaara Report ✦
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl font-normal mb-3" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
            {headerTitle}
          </motion.h1>
          {report.summary && (
            <motion.p variants={fadeUp} className="text-sm max-w-2xl mx-auto" style={{ color: "#6B5344" }}>
              {report.summary}
            </motion.p>
          )}
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-3">
            {isPaid && publicEnv.flags.pdfEnabled ? (
              <a
                href={`/api/reports/${report.id}/pdf`}
                download={`Renovaara-report-${report.id}.html`}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "#111827" }}
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
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
          <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl p-6 text-center" style={{ background: "rgba(17,24,39,0.06)", border: "1px solid rgba(17,24,39,0.2)" }}>
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#111827" }} />
            <p className="text-base font-semibold" style={{ color: "#111827" }}>Payment received — unlocking your report…</p>
          </div>
        )}

        <div className="space-y-8">
          {report.faceShape ? (
            <FaceFeaturesCard
              faceShape={report.faceShape}
              features={report.features}
              blendedConfidence={report.pipelineMeta?.blendedConfidence}
              photoUrl={report.imageUrl}
              previewOnly={!report.features}
            />
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
                <SkinAnalysisCard data={report.skinAnalysis} photoUrl={report.imageUrl} />
              )}
              {report.colorAnalysis && (
                <ColorAnalysisCard data={report.colorAnalysis} photoUrl={report.imageUrl} />
              )}
              {report.hairstyle && (
                <HairstyleCard
                  data={report.hairstyle}
                  photoUrl={report.imageUrl}
                  previewSlots={report.visualAssets?.assets?.hairstylePreviews}
                  reportId={report.id}
                  onRefresh={refresh}
                  faceShape={report.faceShape?.shape}
                  faceTraits={report.faceShape?.traits}
                  stylingTips={report.hairstyle.stylingTips}
                  hairType={report.hairstyle.hairType}
                />
              )}
              {isPaid && report.id && (
                <HairColorCard reportId={report.id} />
              )}
              {report.glasses && (
                <SpectaclesCard
                  data={report.glasses}
                  photoUrl={report.imageUrl}
                  previewSlots={report.visualAssets?.assets?.glassesPreviews}
                  reportId={report.id}
                  onRefresh={refresh}
                  faceShape={report.faceShape?.shape}
                  faceTraits={report.faceShape?.traits}
                />
              )}
              {report.styleGuide && <StyleGuideCard data={report.styleGuide} />}
            </>
          ) : (
            <LockedSections reportId={report.id} onUnlocked={refresh} onOpenPaywall={() => setPaywallOpen(true)} />
          )}
        </div>

        {!isPaid && !paymentInitiated && (
          <div
            className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
            style={{ background: "#111827", boxShadow: "0 -4px 24px rgba(17,24,39,0.25)" }}
          >
            <p className="text-sm font-medium text-white">
              <span className="font-bold">Unlock your complete analysis</span>
            </p>
            <button
              onClick={() => setPaywallOpen(true)}
              className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold"
              style={{ color: "#111827" }}
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
    <div className="rounded-3xl p-12 text-center" style={{ background: "#FDFAF6", border: "1px dashed #E8DDD0" }}>
      <Sparkles className="h-10 w-10 mx-auto mb-3 animate-pulse" style={{ color: "#C8B89A" }} />
      <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>Your analysis is on its way</p>
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
    "Style Guide",
  ];
  return (
    <div className="space-y-4">
      {sections.map((title) => (
        <div
          key={title}
          className="rounded-3xl p-8 text-center"
          style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(17,24,39,0.12)" }}
        >
          <Lock className="h-8 w-8 mx-auto mb-3" style={{ color: "#C8A96E" }} />
          <p className="font-semibold text-ink mb-2">{title}</p>
          <p className="text-sm text-ink-stone mb-4">Unlock the full report to view this section.</p>
          <Paywall reportId={reportId} onUnlocked={onUnlocked} />
        </div>
      ))}
    </div>
  );
}
