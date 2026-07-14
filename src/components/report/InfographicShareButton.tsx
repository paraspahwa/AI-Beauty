"use client";

import * as React from "react";
import { Share2, Loader2, Check } from "lucide-react";
import { SOCIAL_SHARE_TARGETS } from "@/lib/vault/social-share";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { track } from "@/lib/track";

interface Props {
  imageUrl: string;
  sectionKey: string;
  label: string;
  reportId: string;
  shareText: string;
  className?: string;
}

export function InfographicShareButton({
  imageUrl,
  sectionKey,
  label,
  reportId,
  shareText,
  className = "",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const reportUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/report/${reportId}`
      : "";

  function openSocial(targetId: string) {
    const target = SOCIAL_SHARE_TARGETS.find((t) => t.id === targetId);
    if (!target) return;
    const url = target.buildUrl({ url: reportUrl, title: label, text: shareText });
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer,width=600,height=640");
      track("share_infographic", { platform: targetId, section: sectionKey });
    }
    setOpen(false);
  }

  async function handleNativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: label,
          text: shareText,
          url: reportUrl,
        });
        track("share_infographic", { platform: "native", section: sectionKey });
      }
      setOpen(false);
    } catch {
      // user cancelled
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      setFeedback("Link copied!");
      track("share_infographic", { platform: "copy", section: sectionKey });
      setTimeout(() => {
        setCopied(false);
        setFeedback(null);
      }, 2000);
    } catch {
      setFeedback("Could not copy link");
    }
  }

  async function handleDownloadImage() {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Renovaara-${sectionKey}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blob);
      track("share_infographic", { platform: "download", section: sectionKey });
      setFeedback("Image saved!");
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback("Could not download");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-terracotta/20 px-3 py-1.5 text-xs font-medium text-terracotta transition hover:bg-terracotta/10 ${className}`}
        aria-label={`Share ${label}`}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-[var(--color-surface)]">
          <DialogHeader>
            <DialogTitle className="text-base">Share {label}</DialogTitle>
          </DialogHeader>

          {feedback && (
            <p className="flex items-center gap-1.5 text-sm text-sage">
              {copied && <Check className="h-4 w-4" />}
              {feedback}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full rounded-xl bg-espresso px-3 py-2.5 text-sm font-semibold text-[var(--btn-fg)]"
              >
                Share via device…
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-medium hover:bg-blush/40"
            >
              Copy link
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-medium hover:bg-blush/40"
            >
              Save image
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {SOCIAL_SHARE_TARGETS.filter((t) =>
              ["twitter", "facebook", "whatsapp", "telegram", "pinterest", "linkedin"].includes(t.id)
            ).map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => openSocial(target.id)}
                className="rounded-xl border border-[var(--color-border)] px-2 py-2 text-center text-[11px] font-medium hover:bg-blush/40"
              >
                {target.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
