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

export function StyleGuideSection({ report, onRefresh }: Props) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [paymentInitiated, setPaymentInitiated] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const asset: ReportVisualAsset | undefined =
    report.visualAssets?.assets?.analysisInfographics?.styleGuide;
  const isPaid = report.isStyleGuidePaid;
  const bodyUploaded = report.bodyImageUploaded;
  const pending = isPaid && (!asset || asset.status === "pending");

  React.useEffect(() => {
    if (!pending) return;
    const interval = setInterval(onRefresh, 5000);
    return () => clearInterval(interval);
  }, [pending, onRefresh]);

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
      <section>
        <StyleGuideInfographic asset={asset} />
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
      <section
        className="rounded-3xl p-6 sm:p-8 text-center"
        style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}
      >
        <p className="text-sm font-medium mb-2" style={{ color: "#3D2B1F" }}>
          Style Guide generation failed
        </p>
        <p className="text-xs mb-4" style={{ color: "#6B5344" }}>{asset.error ?? "Please try again."}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white"
          style={{ background: "#111827" }}
        >
          Retry generation
        </button>
      </section>
    );
  }

  if (isPaid || paymentInitiated) {
    return (
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9C7D5B" }}>
          Style Guide
        </p>
        <h2 className="text-2xl font-normal mb-4" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
          Your Personal Style Board
        </h2>
        <div
          className="rounded-3xl flex flex-col items-center justify-center gap-4 px-6 py-16"
          style={{ background: "#F7F2EC", border: "1px solid #E4D8CC", aspectRatio: "3/4" }}
        >
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9C7D5B" }} />
          <p className="text-base font-medium text-center" style={{ color: "#3D2B1F" }}>
            {paymentInitiated && !isPaid
              ? "Payment received — starting your Style Guide…"
              : "Generating your personal style guide…"}
          </p>
        </div>
      </section>
    );
  }

  if (bodyUploaded) {
    return (
      <section
        className="rounded-3xl p-6 sm:p-8"
        style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9C7D5B" }}>
          Style Guide Add-on
        </p>
        <h2 className="text-2xl font-normal mb-3" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
          Your full-body style board
        </h2>
        <p className="text-sm mb-6" style={{ color: "#6B5344" }}>
          Full-body photo uploaded. Unlock your AI-generated style infographic with wardrobe essentials,
          flattering silhouettes, and outfit inspiration tailored to you.
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
    <section
      className="rounded-3xl p-6 sm:p-8"
      style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9C7D5B" }}>
        Style Guide Add-on
      </p>
      <h2 className="text-2xl font-normal mb-3" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
        Upload a full-body photo
      </h2>
      <p className="text-sm mb-4" style={{ color: "#6B5344" }}>
        Your Style Guide uses a full-body photo to create a personalised fashion infographic —
        separate from your face selfie analysis.
      </p>
      <ul className="text-sm space-y-1 mb-6" style={{ color: "#6B5344" }}>
        <li className="flex items-center gap-2"><Shirt className="h-4 w-4 shrink-0" /> Head-to-toe visible, good lighting</li>
        <li className="flex items-center gap-2"><Shirt className="h-4 w-4 shrink-0" /> Fitted or semi-fitted clothing works best</li>
        <li className="flex items-center gap-2"><Shirt className="h-4 w-4 shrink-0" /> Stand naturally, face the camera</li>
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
        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "#111827" }}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading ? "Uploading…" : "Upload full-body photo"}
      </button>

      {uploadError && (
        <p className="mt-3 text-sm text-red-500">{uploadError}</p>
      )}
    </section>
  );
}
