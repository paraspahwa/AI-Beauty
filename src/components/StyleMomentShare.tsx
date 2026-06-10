"use client";

import * as React from "react";
import { Copy, Share2, Loader2 } from "lucide-react";
import { track } from "@/lib/track";
import { guestShare } from "@/lib/progressive-unlock";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  caption?: string;
  guest?: boolean;
  assetId?: string;
  onShared?: () => void;
}

async function createShareMoment(input: {
  beforeUrl: string;
  afterUrl: string;
  caption?: string;
  assetId?: string;
}): Promise<{ shareUrl: string; ogImageUrl: string }> {
  const res = await fetch("/api/studio/moment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json() as { shareUrl?: string; ogImageUrl?: string; error?: string };
  if (!res.ok || !json.shareUrl) {
    throw new Error(json.error ?? "Could not create share card");
  }
  return { shareUrl: json.shareUrl, ogImageUrl: json.ogImageUrl ?? json.shareUrl };
}

export function StyleMomentShare({
  beforeUrl,
  afterUrl,
  caption = "Made with Renovaara",
  guest = false,
  assetId,
  onShared,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  async function recordShareProgress() {
    if (guest) {
      guestShare();
      onShared?.();
      return;
    }
    try {
      await fetch("/api/studio/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share" }),
      });
      onShared?.();
    } catch {
      // non-blocking
    }
  }

  async function handleShare() {
    setSharing(true);
    track("share_result", { source: "style_moment" });
    try {
      const { shareUrl } = await createShareMoment({
        beforeUrl,
        afterUrl,
        caption,
        assetId,
      });
      void recordShareProgress();

      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Renovaara look",
            text: caption,
            url: shareUrl,
          });
          return;
        } catch {
          // fall through to copy
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: share image link directly
      const fallback = `${caption}\n${typeof window !== "undefined" ? window.location.origin : ""}/studio`;
      try {
        await navigator.clipboard.writeText(fallback);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={sharing}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "#111827" }}
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {sharing ? "Creating card…" : "Share your look"}
      </button>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(afterUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        style={{ background: "rgba(17,24,39,0.08)", color: "#3D2B1F" }}
      >
        <Copy className="h-4 w-4" />
        {copied ? "Copied!" : "Copy image link"}
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={beforeUrl} alt="" className="hidden" />
    </div>
  );
}
