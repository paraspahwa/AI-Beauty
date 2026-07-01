"use client";

import * as React from "react";
import { Download, Share2, Loader2 } from "lucide-react";
import { publicEnv } from "@/lib/public-env";
import {
  SOCIAL_SHARE_TARGETS,
  canUseNativeShare,
  copyVaultLink,
  nativeShareVaultItem,
} from "@/lib/vault/social-share";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  reportId: string;
  variant: "report" | "styleGuide";
  reportUrl: string;
  faceShape?: string;
  disabled?: boolean;
}

export function PdfDownloadShare({ reportId, variant, reportUrl, faceShape, disabled }: Props) {
  const [shareOpen, setShareOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  if (!publicEnv.flags.pdfEnabled) return null;

  const isStyleGuide = variant === "styleGuide";
  const pdfDownloadUrl = isStyleGuide
    ? `/api/reports/${reportId}/pdf/style-guide`
    : `/api/reports/${reportId}/pdf`;
  const downloadName = isStyleGuide
    ? `Renovaara-style-guide.pdf`
    : `Renovaara-analysis.pdf`;
  const shareTitle = isStyleGuide
    ? "My Renovaara Style Guide"
    : "My Renovaara Beauty Analysis";
  const shareText = isStyleGuide
    ? "My personal style guide from Renovaara."
    : faceShape
      ? `My complete ${faceShape} beauty analysis from Renovaara.`
      : "My complete beauty analysis from Renovaara.";

  const vaultItem = {
    kind: "pdf" as const,
    signedUrl: undefined,
    downloadName,
    reportUrl,
    pdfDownloadUrl,
    shareTitle,
    shareText,
  };

  async function handleDownload() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(pdfDownloadUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setFeedback("Download started");
    } catch {
      setFeedback("PDF not ready yet — try again shortly");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyLink() {
    try {
      await copyVaultLink(reportUrl);
      setFeedback("Link copied");
    } catch {
      setFeedback("Could not copy link");
    }
  }

  async function handleNativeShare() {
    try {
      const ok = await nativeShareVaultItem(vaultItem);
      if (ok) setShareOpen(false);
    } catch {
      setFeedback("Share cancelled");
    }
  }

  function openSocial(targetId: string) {
    const target = SOCIAL_SHARE_TARGETS.find((t) => t.id === targetId);
    if (!target) return;
    const url = target.buildUrl({ url: reportUrl, title: shareTitle, text: shareText });
    if (url) window.open(url, "_blank", "noopener,noreferrer,width=600,height=640");
    setShareOpen(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-[var(--btn-fg)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isStyleGuide ? "Download Style Guide PDF" : "Download Analysis PDF"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 bg-terracotta/10 px-5 py-2.5 text-sm font-semibold text-terracotta disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {feedback && (
        <p className="mt-2 text-xs text-ink-stone">{feedback}</p>
      )}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md bg-[var(--color-surface)]">
          <DialogHeader>
            <DialogTitle>{isStyleGuide ? "Share Style Guide" : "Share Analysis"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {canUseNativeShare() && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="col-span-2 rounded-xl bg-espresso px-3 py-3 text-sm font-semibold text-[var(--btn-fg)] sm:col-span-3"
              >
                Share via device…
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-medium hover:bg-blush/40 transition-colors"
            >
              Copy report link
            </button>
            {SOCIAL_SHARE_TARGETS.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => openSocial(target.id)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-left text-xs font-medium hover:bg-blush/40 transition-colors"
              >
                {target.label}
              </button>
            ))}
          </div>
          <p className="pt-2 text-center text-[11px] text-ink-stone">
            Download the PDF first to post on Instagram or TikTok.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
