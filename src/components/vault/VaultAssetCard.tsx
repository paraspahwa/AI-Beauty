"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Share2,
  Copy,
  FileText,
  Camera,
  ImageIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { VaultItem } from "@/types/vault";
import {
  SOCIAL_SHARE_TARGETS,
  canUseNativeShare,
  copyVaultLink,
  downloadVaultAsset,
  nativeShareVaultItem,
} from "@/lib/vault/social-share";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  item: VaultItem;
}

export function VaultAssetCard({ item }: Props) {
  const [shareOpen, setShareOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<"download" | "copy" | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const date = new Date(item.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const kindLabel =
    item.kind === "upload"
      ? item.uploadType === "body"
        ? "Upload"
        : "Selfie"
      : item.kind === "pdf"
        ? item.pdfVariant === "styleGuide"
          ? "Style PDF"
          : "Analysis PDF"
        : "Analysis";

  async function handleDownload() {
    setBusy("download");
    setFeedback(null);
    try {
      await downloadVaultAsset(item);
      setFeedback("Download started");
    } catch {
      setFeedback("Download failed — try again");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyLink() {
    setBusy("copy");
    try {
      await copyVaultLink(item.reportUrl);
      setFeedback("Link copied");
    } catch {
      setFeedback("Could not copy link");
    } finally {
      setBusy(null);
    }
  }

  async function handleNativeShare() {
    try {
      const ok = await nativeShareVaultItem(item);
      if (ok) setShareOpen(false);
    } catch {
      setFeedback("Share cancelled");
    }
  }

  function openSocial(targetId: string) {
    const target = SOCIAL_SHARE_TARGETS.find((t) => t.id === targetId);
    if (!target) return;
    const url = target.buildUrl({
      url: item.reportUrl,
      title: item.shareTitle,
      text: item.shareText,
      imageUrl: item.signedUrl,
    });
    if (url) window.open(url, "_blank", "noopener,noreferrer,width=600,height=640");
    setShareOpen(false);
  }

  return (
    <>
      <article
        className="group flex flex-col overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))",
          border: "1px solid rgba(17,24,39,0.14)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div className="relative aspect-[4/5] bg-[#F5F0EA] overflow-hidden">
          {item.kind === "pdf" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-14 w-14" style={{ color: "#9C7D5B" }} />
              <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>
                {item.pdfVariant === "styleGuide" ? "Style Guide PDF" : "Analysis PDF"}
              </p>
              <p className="text-xs" style={{ color: "#6B5344" }}>
                Generated infographic pages only
              </p>
            </div>
          ) : item.signedUrl ? (
            <Image
              src={item.signedUrl}
              alt={item.label}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, 320px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-[#C8B89A]" />
            </div>
          )}
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "rgba(17,24,39,0.85)", color: "#fff" }}
          >
            {kindLabel}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-ink line-clamp-2">{item.label}</p>
            <p className="text-xs text-ink-stone mt-1">{date}</p>
          </div>

          <div className="mt-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy === "download"}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "#111827" }}
            >
              {busy === "download" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
              style={{ background: "rgba(17,24,39,0.08)", color: "#111827", border: "1px solid rgba(17,24,39,0.15)" }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>

          <Link
            href={`/report/${item.reportId}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-stone hover:text-ink transition-colors"
          >
            View report <ExternalLink className="h-3 w-3" />
          </Link>

          {feedback && (
            <p className="text-[11px] text-center" style={{ color: "#6B5344" }}>{feedback}</p>
          )}
        </div>
      </article>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md" style={{ background: "#FDFAF6" }}>
          <DialogHeader>
            <DialogTitle className="text-lg">Share {item.label}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {canUseNativeShare() && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="col-span-2 sm:col-span-3 rounded-xl px-3 py-3 text-sm font-semibold text-white"
                style={{ background: "#111827" }}
              >
                <Share2 className="inline h-4 w-4 mr-2" />
                Share via device…
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl px-3 py-3 text-xs font-medium border border-[#E8DDD0] hover:bg-white transition-colors"
            >
              <Copy className="inline h-3.5 w-3.5 mr-1" />
              Copy link
            </button>
            {SOCIAL_SHARE_TARGETS.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => openSocial(target.id)}
                className="rounded-xl px-3 py-3 text-xs font-medium border border-[#E8DDD0] hover:bg-white transition-colors text-left"
              >
                {target.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-ink-stone text-center pt-2">
            For Instagram or TikTok, download the image first, then upload from your camera roll.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
