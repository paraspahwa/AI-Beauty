"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  X,
  ChevronLeft,
  ImageIcon,
} from "lucide-react";
import { Paywall } from "@/components/Paywall";
import type { AnalysisInfographicSectionId } from "@/types/report";
import { fadeUp, staggerContainer } from "@/lib/animations";

type SectionAsset = {
  status: "missing" | "pending" | "ready" | "failed";
  signedUrl?: string;
  width?: number;
  height?: number;
  error?: string | null;
  styleName?: string;
};

type BlueprintSection = {
  id: AnalysisInfographicSectionId;
  label: string;
  description: string;
  generatable: boolean;
  order: number;
  asset: SectionAsset;
};

type InfographicsPayload = {
  reportId: string;
  reportStatus: string;
  isPaid: boolean;
  falConfigured: boolean;
  sections: BlueprintSection[];
};

interface Props {
  reportId: string;
  isPaid: boolean;
  reportStatus: string;
  headerTitle?: string;
}

export function BlueprintGallery({ reportId, isPaid, reportStatus, headerTitle }: Props) {
  const [data, setData] = React.useState<InfographicsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState<Set<string>>(new Set());
  const [paywallOpen, setPaywallOpen] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ url: string; label: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await fetch(`/api/reports/${reportId}/infographics`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load blueprint status");
      return;
    }
    setData(await res.json());
    setError(null);
  }, [reportId]);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const anyPending = data?.sections.some((s) => s.asset.status === "pending") ?? false;
  React.useEffect(() => {
    if (!anyPending && generating.size === 0) return;
    const interval = setInterval(() => void refresh(), 4000);
    return () => clearInterval(interval);
  }, [anyPending, generating.size, refresh]);

  async function generateAll() {
    if (!isPaid) {
      setPaywallOpen(true);
      return;
    }
    setError(null);
    setGenerating(new Set(data?.sections.filter((s) => s.generatable).map((s) => s.id) ?? []));
    try {
      const res = await fetch(`/api/reports/${reportId}/infographics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not start generation");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(new Set());
    }
  }

  async function generateSection(sectionId: AnalysisInfographicSectionId, force = false) {
    if (!isPaid) {
      setPaywallOpen(true);
      return;
    }
    setGenerating((prev) => new Set(prev).add(sectionId));
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/infographics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: [sectionId], force }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  }

  const readyCount = data?.sections.filter((s) => s.asset.status === "ready").length ?? 0;
  const totalGeneratable = data?.sections.filter((s) => s.generatable).length ?? 1;
  const anyPendingOrGenerating =
    anyPending ||
    generating.size > 0 ||
    (data?.sections.some((s) => s.generatable && s.asset.status === "pending") ?? false);

  return (
    <div className="min-h-screen" style={{ background: "#FDFAF6" }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={`/report/${reportId}`}
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "#9C7D5B" }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to full report
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "#9C7D5B" }}>
              ✦ Beauty Blueprint ✦
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl" style={{ color: "#2C1A10" }}>
              {headerTitle ?? "Your Visual Analysis Kit"}
            </h1>
            <p className="mt-2 text-sm max-w-lg" style={{ color: "#6B5344" }}>
              Downloadable infographic boards — one luxury image per analysis section.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isPaid && reportStatus === "ready" && (
              <button
                type="button"
                onClick={() => void generateAll()}
                disabled={anyPendingOrGenerating || !data?.falConfigured}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: "#111827", color: "#fff" }}
              >
                {anyPendingOrGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate all
              </button>
            )}
            <a
              href={readyCount > 0 && isPaid ? `/api/reports/${reportId}/infographics/download` : undefined}
              onClick={(e) => {
                if (!isPaid || readyCount === 0) {
                  e.preventDefault();
                  if (!isPaid) setPaywallOpen(true);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                readyCount > 0 && isPaid ? "" : "opacity-50 cursor-not-allowed"
              }`}
              style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", color: "#3D2B1F" }}
            >
              <Download className="h-4 w-4" />
              Download all
            </a>
          </div>
        </div>

        {reportStatus !== "ready" && (
          <div
            className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.35)", color: "#9C7D5B" }}
          >
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            Your analysis is still processing — blueprint generation unlocks when the report is ready.
          </div>
        )}

        {!isPaid && (
          <div
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4"
            style={{ background: "#111827", color: "#fff" }}
          >
            <p className="text-sm">
              <span className="font-semibold">Unlock your Beauty Blueprint</span>
              <span className="hidden sm:inline"> — generate &amp; download infographic boards</span>
            </p>
            <button
              type="button"
              onClick={() => setPaywallOpen(true)}
              className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold"
              style={{ color: "#111827" }}
            >
              Unlock now →
            </button>
          </div>
        )}

        {error && (
          <div
            className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "rgba(192,107,62,0.1)", border: "1px solid rgba(192,107,62,0.3)", color: "#C06B3E" }}
          >
            {error}
          </div>
        )}

        {data && !data.falConfigured && isPaid && (
          <div
            className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#B45309" }}
          >
            Infographic generation requires FAL_KEY to be set on the server.
          </div>
        )}

        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full overflow-hidden" style={{ background: "#E8DDD0" }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.round((readyCount / totalGeneratable) * 100)}%`,
                background: "#111827",
              }}
            />
          </div>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#9C7D5B" }}>
            {readyCount}/{totalGeneratable} ready
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9C7D5B" }} />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {(data?.sections ?? []).map((section) => (
              <BlueprintCard
                key={section.id}
                section={section}
                isPaid={isPaid}
                reportReady={reportStatus === "ready"}
                isGenerating={generating.has(section.id)}
                onGenerate={() => void generateSection(section.id)}
                onRegenerate={() => void generateSection(section.id, true)}
                onView={(url) => setLightbox({ url, label: section.label })}
                onUnlock={() => setPaywallOpen(true)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,24,39,0.85)" }}
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white hover:opacity-80"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <p className="text-white text-sm font-medium mb-2">{lightbox.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="w-full h-auto rounded-2xl shadow-2xl max-h-[80vh] object-contain"
            />
            <a
              href={lightbox.url}
              download
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold"
              style={{ color: "#111827" }}
            >
              <Download className="h-4 w-4" />
              Download PNG
            </a>
          </div>
        </div>
      )}

      <Paywall
        reportId={reportId}
        externalOpen={paywallOpen}
        onExternalOpenChange={setPaywallOpen}
        onUnlocked={() => {
          setPaywallOpen(false);
          void refresh().then(() => generateAll());
        }}
      />
    </div>
  );
}

function BlueprintCard({
  section,
  isPaid,
  reportReady,
  isGenerating,
  onGenerate,
  onRegenerate,
  onView,
  onUnlock,
}: {
  section: BlueprintSection;
  isPaid: boolean;
  reportReady: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onView: (url: string) => void;
  onUnlock: () => void;
}) {
  const { asset } = section;
  const busy = isGenerating || asset.status === "pending";
  const locked = !isPaid;
  const comingSoon = !section.generatable;

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col overflow-hidden rounded-2xl"
      style={{ background: "#fff", border: "1px solid #E8DDD0", boxShadow: "0 4px 16px rgba(61,43,31,0.06)" }}
    >
      <div className="relative aspect-[4/5] w-full" style={{ background: "#EDE3D8" }}>
        {asset.status === "ready" && asset.signedUrl && isPaid ? (
          <button
            type="button"
            className="relative h-full w-full cursor-zoom-in"
            onClick={() => onView(asset.signedUrl!)}
            aria-label={`View ${section.label} infographic`}
          >
            <Image
              src={asset.signedUrl}
              alt={section.label}
              fill
              unoptimized
              className="object-cover object-top"
            />
          </button>
        ) : busy ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9C7D5B" }} />
            <p className="text-xs font-medium" style={{ color: "#6B5344" }}>
              Generating infographic…
              <br />
              <span className="opacity-70">This can take up to 90 seconds</span>
            </p>
          </div>
        ) : asset.status === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-xs font-medium" style={{ color: "#C06B3E" }}>
              Generation failed
            </p>
            {asset.error ? (
              <p className="text-[10px] line-clamp-3 opacity-80" style={{ color: "#6B5344" }}>
                {asset.error}
              </p>
            ) : null}
          </div>
        ) : comingSoon ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center opacity-60">
            <ImageIcon className="h-10 w-10" style={{ color: "#C8B89A" }} />
            <p className="text-xs font-medium" style={{ color: "#9C7D5B" }}>Coming soon</p>
          </div>
        ) : locked ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Lock className="h-8 w-8" style={{ color: "#C8A96E" }} />
            <p className="text-xs font-medium" style={{ color: "#6B5344" }}>Unlock to generate</p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Sparkles className="h-10 w-10" style={{ color: "#C8B89A" }} />
            <p className="text-xs font-medium" style={{ color: "#9C7D5B" }}>Ready to generate</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-serif text-lg" style={{ color: "#2C1A10" }}>{section.label}</h3>
          <p className="text-xs mt-0.5" style={{ color: "#9C7D5B" }}>{section.description}</p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          {comingSoon ? (
            <span
              className="inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: "#F0E8DC", color: "#9C7D5B" }}
            >
              Coming soon
            </span>
          ) : asset.status === "ready" && asset.signedUrl && isPaid ? (
            <>
              <button
                type="button"
                onClick={() => onView(asset.signedUrl!)}
                className="flex-1 rounded-xl py-2 text-xs font-semibold"
                style={{ background: "#111827", color: "#fff" }}
              >
                View
              </button>
              <a
                href={asset.signedUrl}
                download={`renovaara-${section.id}.jpg`}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2"
                style={{ border: "1px solid #E8DDD0", color: "#3D2B1F" }}
                aria-label={`Download ${section.label}`}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onRegenerate}
                disabled={busy || !reportReady}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2 disabled:opacity-40"
                style={{ border: "1px solid #E8DDD0", color: "#3D2B1F" }}
                aria-label="Regenerate"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              </button>
            </>
          ) : locked ? (
            <button
              type="button"
              onClick={onUnlock}
              className="w-full rounded-xl py-2 text-xs font-semibold"
              style={{ background: "#111827", color: "#fff" }}
            >
              Unlock to generate
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={busy || !reportReady}
              className="w-full rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
              style={{ background: "#111827", color: "#fff" }}
            >
              {busy ? "Generating…" : "Generate infographic"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
