"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Share2, Sparkles } from "lucide-react";
import { FaceFeaturesCard } from "./FaceFeaturesCard";
import { ColorAnalysisCard } from "./ColorAnalysisCard";
import { SkinAnalysisCard } from "./SkinAnalysisCard";
import { SpectaclesCard } from "./SpectaclesCard";
import { HairstyleCard } from "./HairstyleCard";
import { Paywall } from "@/components/Paywall";
import type { CompiledReport } from "@/types/report";

const TABS = [
  { value: "face",    label: "Face" },
  { value: "color",   label: "Color" },
  { value: "skin",    label: "Skin" },
  { value: "glasses", label: "Spectacles" },
  { value: "hair",    label: "Hairstyle" },
] as const;

interface Props {
  report: CompiledReport;
}

export function ReportLayout({ report: initial }: Props) {
  const [report, setReport] = React.useState(initial);
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
    } catch { /* user cancelled */ }
  }

  return (
    <div className="container max-w-5xl py-8 sm:py-12">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-deep">Your StyleAI report</p>
        <h1 className="mt-2 text-4xl sm:text-5xl text-ink">
          ✦ Personal Beauty Profile ✦
        </h1>
        {report.summary && (
          <p className="mx-auto mt-4 max-w-2xl text-sm text-ink-soft leading-relaxed">{report.summary}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
          {isPaid ? (
            <Button asChild variant="accent">
              <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noopener">
                <Download className="h-4 w-4" /> Download PDF
              </a>
            </Button>
          ) : (
            <Paywall reportId={report.id} onUnlocked={refresh} />
          )}
        </div>
      </header>

      <Tabs defaultValue="face">
        <div className="flex justify-center">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="face">
          {report.faceShape && report.features ? (
            <FaceFeaturesCard faceShape={report.faceShape} features={report.features} />
          ) : <Empty />}
        </TabsContent>

        <TabsContent value="color">
          {report.colorAnalysis ? <ColorAnalysisCard data={report.colorAnalysis} /> : <Empty />}
        </TabsContent>

        <TabsContent value="skin">
          {isPaid && report.skinAnalysis
            ? <SkinAnalysisCard data={report.skinAnalysis} />
            : <Locked reportId={report.id} onUnlocked={refresh} title="Skin Analysis" />}
        </TabsContent>

        <TabsContent value="glasses">
          {isPaid && report.glasses
            ? <SpectaclesCard data={report.glasses} />
            : <Locked reportId={report.id} onUnlocked={refresh} title="Spectacles Guide" />}
        </TabsContent>

        <TabsContent value="hair">
          {isPaid && report.hairstyle
            ? <HairstyleCard data={report.hairstyle} />
            : <Locked reportId={report.id} onUnlocked={refresh} title="Hairstyle Guide" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/60 p-10 text-center text-sm text-ink-muted">
      Analysis is still processing. Refresh in a moment.
    </div>
  );
}

function Locked({ title, reportId, onUnlocked }: { title: string; reportId: string; onUnlocked: () => void }) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-gradient-to-br from-cream-100 to-cream-200/60 p-10 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-accent-deep shadow-card">
        <Sparkles className="h-5 w-5" />
      </span>
      <h3 className="font-serif text-2xl text-ink">{title} is locked</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Unlock the full report to see this section plus a downloadable PDF.
      </p>
      <div className="mt-6 flex justify-center">
        <Paywall reportId={reportId} onUnlocked={onUnlocked} />
      </div>
    </div>
  );
}
