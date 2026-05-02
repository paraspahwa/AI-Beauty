"use client";

import Image from "next/image";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Share2, Sparkles, Lock, Loader2 } from "lucide-react";
import { FaceFeaturesCard } from "./FaceFeaturesCard";
import { ColorAnalysisCard } from "./ColorAnalysisCard";
import { SkinAnalysisCard } from "./SkinAnalysisCard";
import { SpectaclesCard } from "./SpectaclesCard";
import { HairstyleCard } from "./HairstyleCard";
import { Paywall } from "@/components/Paywall";
import type { CompiledReport } from "@/types/report";
import { fadeUp, staggerContainer, tabContent } from "@/lib/animations";

const TABS = [
  { value: "face", label: "Face" },
  { value: "color", label: "Color" },
  { value: "skin", label: "Skin" },
  { value: "glasses", label: "Spectacles" },
  { value: "hair", label: "Hairstyle" },
] as const;

interface Props {
  report: CompiledReport;
}

export function ReportLayout({ report: initial }: Props) {
  const [report, setReport] = React.useState(initial);
  const [activeTab, setActiveTab] = React.useState("face");
  const [copied, setCopied] = React.useState(false);
  const [visualsLoading, setVisualsLoading] = React.useState(false);
  const [visualsFailed, setVisualsFailed] = React.useState(false);
  const isPaid = report.isPaid;
  const isProcessing = report.status === "processing" || report.status === "pending";

  async function refresh() {
    const res = await fetch(`/api/reports/${report.id}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
  }

  // Poll while the report is still processing
  React.useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, report.id]);

  // When the report is ready but visuals haven't been generated yet, trigger
  // the async visuals route and refresh once it finishes.
  React.useEffect(() => {
    if (report.status !== "ready") return;
    const hasVisuals = !!report.visualAssets?.assets?.paletteBoard;
    if (hasVisuals || visualsLoading) return;
    triggerVisuals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.status, report.id]);

  async function triggerVisuals() {
    setVisualsLoading(true);
    setVisualsFailed(false);
    try {
      const res = await fetch(`/api/reports/${report.id}/visuals`, { method: "POST" });
      if (res.ok) await refresh();
      else setVisualsFailed(true);
    } catch {
      setVisualsFailed(true);
    } finally {
      setVisualsLoading(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/report/${report.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My StyleAI report", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="container max-w-5xl py-8 sm:py-12">
      <motion.header
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mb-10 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-xs uppercase tracking-[0.3em] font-medium"
          style={{ color: "#C9956B" }}
        >
          Your StyleAI report
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-3 text-4xl sm:text-5xl text-ink"
        >
          Personal Beauty Profile
        </motion.h1>
        {report.summary && (
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-sm text-ink-stone leading-relaxed"
          >
            {report.summary}
          </motion.p>
        )}
        {(report.visualAssets?.assets.landmarkOverlay?.signedUrl || report.visualAssets?.assets.paletteBoard?.signedUrl) && (
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-6 grid w-full max-w-4xl gap-4 sm:grid-cols-2"
          >
            {report.visualAssets?.assets.landmarkOverlay?.signedUrl && (
              <div className="overflow-hidden rounded-2xl" style={{ background: "rgba(18,18,26,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="relative h-52 w-full">
                <Image
                  src={report.visualAssets.assets.landmarkOverlay.signedUrl}
                  alt="Face landmark overlay"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
                </div>
                <p className="px-3 py-2 text-xs text-ink-stone">Face landmark map</p>
              </div>
            )}
            {report.visualAssets?.assets.paletteBoard?.signedUrl && (
              <div className="overflow-hidden rounded-2xl" style={{ background: "rgba(18,18,26,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="relative h-52 w-full">
                <Image
                  src={report.visualAssets.assets.paletteBoard.signedUrl}
                  alt="Color palette board"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
                </div>
                <p className="px-3 py-2 text-xs text-ink-stone">Personal color board</p>
              </div>
            )}
          </motion.div>
        )}
        {/* Visuals generating banner — shows while async /visuals endpoint is running */}
        {visualsLoading && !report.visualAssets?.assets?.paletteBoard && (
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm"
            style={{
              background: "rgba(201,149,107,0.08)",
              border: "1px solid rgba(201,149,107,0.25)",
              color: "#C9956B",
            }}
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>Generating your visual style board — this takes ~30 seconds…</span>
          </motion.div>
        )}
        {/* Visuals failed banner with retry */}
        {visualsFailed && !visualsLoading && !report.visualAssets?.assets?.paletteBoard && (
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#fca5a5",
            }}
          >
            <span>Visual style board failed to generate.</span>
            <button
              onClick={triggerVisuals}
              className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
            >
              Retry
            </button>
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="mt-6 flex flex-wrap justify-center gap-3"
        >
          <Button variant="outline" onClick={share} className="min-w-[120px]">
            <Share2 className="h-4 w-4" /> {copied ? "Copied ✨" : "Share"}
          </Button>
          {isPaid ? (
            <Button asChild variant="accent">
              <a
                href={`/api/reports/${report.id}/pdf`}
                download={`styleai-report-${report.id}.html`}
                rel="noopener"
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
            </Button>
          ) : (
            <Paywall reportId={report.id} onUnlocked={refresh} />
          )}
        </motion.div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8">
            <TabsList
              className="backdrop-blur-md"
              style={{ background: "rgba(18,18,26,0.85)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
            >
              {TABS.map((t) => {
                const isLocked =
                  !isPaid && (t.value === "skin" || t.value === "glasses" || t.value === "hair");

                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="relative data-[state=active]:text-obsidian data-[state=active]:shadow-glow data-[state=active]:bg-[linear-gradient(135deg,#C9956B,#E8C990)]"
                  >
                    {isLocked && (
                      <Lock className="h-3 w-3 mr-1.5 animate-pulse-slow" style={{ color: "#C9956B" }} />
                    )}
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
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
                    <FaceFeaturesCard faceShape={report.faceShape} features={report.features} blendedConfidence={report.pipelineMeta?.blendedConfidence} />
                  ) : (
                    <Empty />
                  )}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="color" className="mt-0">
              {activeTab === "color" && (
                <motion.div
                  key="color"
                  variants={tabContent}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {report.colorAnalysis ? (
                    <ColorAnalysisCard data={report.colorAnalysis} />
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
                  {isPaid && report.skinAnalysis ? (
                    <SkinAnalysisCard data={report.skinAnalysis} />
                  ) : (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      title="Skin Analysis"
                    />
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
                  {isPaid && report.glasses ? (
                    <SpectaclesCard
                      data={report.glasses}
                      previewUrls={
                        report.visualAssets?.assets.glassesPreviews
                          ?.filter((a) => a.status === "ready" && a.signedUrl)
                          .map((a) => a.signedUrl!)
                      }
                    />
                  ) : (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      title="Spectacles Guide"
                    />
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
                  {isPaid && report.hairstyle ? (
                    <HairstyleCard
                      data={report.hairstyle}
                      previewUrls={
                        report.visualAssets?.assets.hairstylePreviews
                          ?.filter((a) => a.status === "ready" && a.signedUrl)
                          .map((a) => a.signedUrl!)
                      }
                    />
                  ) : (
                    <Locked
                      reportId={report.id}
                      onUnlocked={refresh}
                      title="Hairstyle Guide"
                    />
                  )}
                </motion.div>
              )}
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </motion.div>
    </div>
  );
}

function Empty() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl p-12 text-center"
      style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.8), rgba(26,26,38,0.6))", border: "1px dashed rgba(255,255,255,0.1)" }}
    >
      <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: "rgba(240,232,216,0.2)" }} />
      <p className="text-sm text-ink-stone font-medium mb-1">Analysis is still processing</p>
      <p className="text-xs text-ink-mist">Refresh in a moment to see your results</p>
    </motion.div>
  );
}

function Locked({
  title,
  reportId,
  onUnlocked,
}: {
  title: string;
  reportId: string;
  onUnlocked: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-4xl p-12 sm:p-16 text-center relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(201,149,107,0.18)" }}
    >
      {/* Decorative background elements */}
      <motion.div
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl"
        style={{ background: "rgba(201,149,107,0.08)" }}
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
        style={{ background: "rgba(123,110,158,0.08)" }}
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
            style={{ background: "rgba(201,149,107,0.25)" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center mx-auto rounded-full text-obsidian shadow-glow" style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)" }}>
            <Lock className="h-8 w-8" />
          </div>
        </motion.div>

        <h3 className="font-serif text-2xl sm:text-3xl text-ink mb-3">{title} is locked</h3>
        <p className="mx-auto max-w-md text-sm text-ink-stone leading-relaxed mb-8">
          Unlock the full report to see this section plus skin analysis, hairstyles, spectacles
          guide, and a downloadable PDF.
        </p>
        <div className="flex justify-center">
          <Paywall reportId={reportId} onUnlocked={onUnlocked} />
        </div>
      </div>
    </motion.div>
  );
}
