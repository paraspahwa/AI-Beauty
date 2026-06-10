"use client";

import * as React from "react";
import { Copy, Share2 } from "lucide-react";
import { track } from "@/lib/track";
import { guestShare } from "@/lib/progressive-unlock";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  caption?: string;
  guest?: boolean;
  onShared?: () => void;
}

export function StyleMomentShare({
  beforeUrl,
  afterUrl,
  caption = "Made with Renovaara",
  guest = false,
  onShared,
}: Props) {
  const [copied, setCopied] = React.useState(false);

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
    track("share_result", { source: "style_moment" });
    void recordShareProgress();
    const text = `${caption}\n${typeof window !== "undefined" ? window.location.origin : ""}/studio`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My Renovaara look", text, url: afterUrl });
        return;
      } catch {
        // fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "#111827" }}
      >
        <Share2 className="h-4 w-4" />
        Share your look
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
