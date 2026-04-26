"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Share2, Sparkles, Lock } from "lucide-react";
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
  const isPaid = report.isPaid;

  async function refresh() {
    const res = await fetch(`/api/reports/${report.id}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
  }

  async function share() {
    const url = `${window.location.origin}/report/${report.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My StyleAI report", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
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
          className="text-xs uppercase tracking-[0.3em] text-terracotta font-medium"
        >
          Your StyleAI report
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-3 text-4xl sm:text-5xl text-ink divider-stars"
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
        <motion.div
          variants={fadeUp}
          className="mt-6 flex flex-wrap justify-center gap-3"
        >
          <Button variant="outline" onClick={share} className="min-w-[120px]">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          {isPaid ? (
            <Button asChild variant="accent">
              <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noopener">
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
            <TabsList className="glass border border-cream-200 shadow-card">
              {TABS.map((t) => {
                const isLocked =
                  !isPaid && (t.value === "skin" || t.value === "glasses" || t.value === "hair");

                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="relative data-[state=active]:bg-white data-[state=active]:shadow-card"
                  >
                    {isLocked && (
                      <Lock className="h-3 w-3 mr-1.5 text-terracotta animate-pulse-slow" />
                    )}
                    {t.label}
                    {activeTab === t.value && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-px left-0 right-0 h-0.5 bg-gradient-to-r from-terracotta via-camel to-terracotta"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
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
                    <FaceFeaturesCard faceShape={report.faceShape} features={report.features} />
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
                    <SpectaclesCard data={report.glasses} />
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
                    <HairstyleCard data={report.hairstyle} />
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
      className="rounded-3xl border-2 border-dashed border-cream-300 bg-cream-50 p-12 text-center"
    >
      <Sparkles className="h-10 w-10 text-ink-mist mx-auto mb-3" />
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
      className="rounded-4xl border-2 border-cream-200 bg-gradient-to-br from-cream-100 via-cream-50 to-cream-100 p-12 sm:p-16 text-center relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <motion.div
        className="absolute top-0 right-0 w-48 h-48 rounded-full bg-terracotta/5 blur-3xl"
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
        className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-sage/5 blur-3xl"
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
            className="absolute inset-0 rounded-full bg-terracotta/20 blur-xl"
          />
          <div className="relative flex h-16 w-16 items-center justify-center mx-auto rounded-full bg-gradient-to-br from-terracotta to-camel text-white shadow-premium">
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
