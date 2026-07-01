"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Share2,
  Copy,
  FileText,
  ImageIcon,
  ExternalLink,
  Loader2,
  Trash2,
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
  onDeleted?: () => void;
}

export function VaultAssetCard({ item, onDeleted }: Props) {
  const [shareOpen, setShareOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<"download" | "copy" | "delete" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const deleteTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const canDelete = item.kind === "upload" || item.kind === "analysis";

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

  React.useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  async function handleDelete() {
    if (!canDelete) return;

    if (!deleteConfirm) {
      setFeedback(null);
      setDeleteConfirm(true);
      deleteTimeoutRef.current = setTimeout(() => setDeleteConfirm(false), 5000);
      return;
    }

    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }

    setBusy("delete");
    setFeedback(null);
    try {
      const res = await fetch("/api/vault/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Delete failed");
      }
      onDeleted?.();
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(null);
      setDeleteConfirm(false);
    }
  }

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
          background: "var(--color-surface)",
          border: "1px solid rgba(184,115,74,0.18)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div className="relative aspect-[4/5] bg-blush overflow-hidden">
          {item.kind === "pdf" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-14 w-14" style={{ color: "var(--rose-gold)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                {item.pdfVariant === "styleGuide" ? "Style Guide PDF" : "Analysis PDF"}
              </p>
              <p className="text-xs" style={{ color: "var(--ink-stone)" }}>
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
              <ImageIcon className="h-10 w-10 text-rose-gold" />
            </div>
          )}
          <span
            className="absolute left-3 top-3 rounded-full bg-espresso/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
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
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-espresso px-3 py-2 text-xs font-semibold text-[var(--btn-fg)] disabled:opacity-60"
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
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-terracotta/20 bg-terracotta/10 px-3 py-2 text-xs font-semibold text-terracotta"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy === "delete"}
                aria-label={deleteConfirm ? "Confirm delete" : "Delete from vault"}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-60 border-[var(--color-border)] bg-blush/50 text-ink-stone data-[confirm]:border-red-300"
                style={{
                  background: deleteConfirm ? "rgba(248,113,113,0.12)" : undefined,
                  color: deleteConfirm ? "#DC2626" : undefined,
                  borderColor: deleteConfirm ? "rgba(248,113,113,0.35)" : undefined,
                }}
              >
                {busy === "delete" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {deleteConfirm ? "Confirm delete?" : "Delete"}
              </button>
            ) : null}
          </div>

          <Link
            href={`/report/${item.reportId}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-stone hover:text-ink transition-colors"
          >
            View report <ExternalLink className="h-3 w-3" />
          </Link>

          {feedback && (
            <p className="text-[11px] text-center" style={{ color: "var(--ink-stone)" }}>{feedback}</p>
          )}
        </div>
      </article>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md bg-[var(--color-surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg">Share {item.label}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {canUseNativeShare() && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="col-span-2 rounded-xl bg-espresso px-3 py-3 text-sm font-semibold text-[var(--btn-fg)] sm:col-span-3"
              >
                <Share2 className="inline h-4 w-4 mr-2" />
                Share via device…
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-xs font-medium transition-colors hover:bg-blush/40"
            >
              <Copy className="inline h-3.5 w-3.5 mr-1" />
              Copy link
            </button>
            {SOCIAL_SHARE_TARGETS.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => openSocial(target.id)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-left text-xs font-medium transition-colors hover:bg-blush/40"
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
