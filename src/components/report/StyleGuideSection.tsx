"use client";

import * as React from "react";
import { Loader2, Upload, Shirt } from "lucide-react";
import { StyleGuideInfographic } from "./StyleGuideInfographic";
import { StyleGuidePaywall } from "./StyleGuidePaywall";
import { PdfDownloadShare } from "./PdfDownloadShare";
import { publicEnv } from "@/lib/public-env";
import type { CompiledReport, ReportVisualAsset } from "@/types/report";

interface Props {
  report: CompiledReport;
  onRefresh: () => void;
}

function GeneratingPanel({ message }: { message: string }) {
  return (
    <section id="report-section-style-guide" className="scroll-mt-24">
      <p className="foil-label mb-2 border-none p-0">Style Guide</p>
      <h2 className="font-display mb-4 text-2xl text-ink">Your Personal Style Board</h2>
      <div
        className="report-surface-panel flex flex-col items-center justify-center gap-4 rounded-3xl px-6 py-16"
        style={{ background: "var(--infographic-frame)", aspectRatio: "3/4" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
        <p className="text-center text-base font-medium text-ink">{message}</p>
      </div>
    </section>
  );
}

export function StyleGuideSection({ report, onRefresh }: Props) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [paymentInitiated, setPaymentInitiated] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const asset: ReportVisualAsset | undefined =
    report.visualAssets?.assets?.analysisInfographics?.styleGuide;
  const isPaid = report.isStyleGuidePaid;
  const bodyUploaded = report.bodyImageUploaded;
  const creating =
    isPaid &&
    bodyUploaded &&
    (!asset || asset.status === "pending");

  React.useEffect(() => {
    if (!creating && !(paymentInitiated && !isPaid)) return;
    const interval = setInterval(onRefresh, 5000);
    return () => clearInterval(interval);
  }, [creating, paymentInitiated, isPaid, onRefresh]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`/api/reports/${report.id}/body-image`, {
        method: "POST",
        body: form,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Upload failed");
      onRefresh();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRetry() {
    await fetch(`/api/reports/${report.id}/retry-style-guide`, { method: "POST" });
    onRefresh();
  }

  if (isPaid && asset?.status === "ready") {
    return (
      <section id="report-section-style-guide" className="scroll-mt-24">
        <StyleGuideInfographic asset={asset} createdAt={report.createdAt} />
        <div className="mt-4">
          <PdfDownloadShare
            reportId={report.id}
            variant="styleGuide"
            reportUrl={`${publicEnv.app.url.replace(/\/$/, "")}/report/${report.id}`}
            faceShape={report.faceShape?.shape}
          />
        </div>
      </section>
    );
  }

  if (isPaid && asset?.status === "failed") {
    return (
      <section id="report-section-style-guide" className="report-surface-panel scroll-mt-24 rounded-3xl p-6 text-center sm:p-8">
        <p className="mb-2 text-sm font-medium text-ink">Style Guide generation failed</p>
        <p className="mb-4 text-xs text-ink-stone">{asset.error ?? "Please try again."}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-full bg-espresso px-5 py-2 text-sm font-semibold text-[var(--btn-fg)]"
        >
          Retry generation
        </button>
      </section>
    );
  }

  if (paymentInitiated && !isPaid && bodyUploaded) {
    return (
      <GeneratingPanel message="Payment received — starting your Personal Style Board…" />
    );
  }

  if (creating) {
    return (
      <GeneratingPanel message="Creating your Personal Style Board…" />
    );
  }

  if (bodyUploaded && !isPaid) {
    return (
      <section id="report-section-style-guide" className="report-surface-panel scroll-mt-24 rounded-3xl p-6 sm:p-8">
        <p className="foil-label mb-2 border-none p-0">Step 2 of 3</p>
        <h2 className="font-display mb-3 text-2xl text-ink">Your Personal Style Board</h2>
        <p className="mb-6 text-sm text-ink-stone">
          Full-body photo uploaded. Pay to unlock — we&apos;ll analyze your photo and generate a
          personalised wardrobe infographic with essentials, silhouettes, and accent colours.
        </p>
        <StyleGuidePaywall
          reportId={report.id}
          onUnlocked={() => {
            setPaymentInitiated(true);
            onRefresh();
          }}
        />
      </section>
    );
  }

  return (
    <section id="report-section-style-guide" className="report-surface-panel scroll-mt-24 rounded-3xl p-6 sm:p-8">
      <p className="foil-label mb-2 border-none p-0">Step 1 of 3</p>
      <h2 className="font-display mb-3 text-2xl text-ink">Your Personal Style Board</h2>
      <p className="mb-4 text-sm text-ink-stone">
        Upload a separate full-body photo — not your face selfie. After upload, unlock the add-on
        and we&apos;ll analyze your silhouette to build your board.
      </p>
      <ul className="mb-6 space-y-1 text-sm text-ink-stone">
        <li className="flex items-center gap-2"><Shirt className="h-4 w-4 shrink-0 text-terracotta" /> Head-to-toe visible, good lighting</li>
        <li className="flex items-center gap-2"><Shirt className="h-4 w-4 shrink-0 text-terracotta" /> Fitted or semi-fitted clothing works best</li>
        <li className="flex items-center gap-2"><Shirt className="h-4 w-4 shrink-0 text-terracotta" /> Stand naturally, face the camera</li>
      </ul>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-[var(--btn-fg)] disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading ? "Uploading…" : "Upload full-body photo"}
      </button>

      {uploadError && (
        <p className="mt-3 text-sm text-red-600">{uploadError}</p>
      )}
    </section>
  );
}
