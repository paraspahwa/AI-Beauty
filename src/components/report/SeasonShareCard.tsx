"use client";

import * as React from "react";
import { Download, Share2, Loader2, Check } from "lucide-react";
import { track } from "@/lib/track";
import type { FaceShape, ColorSeason } from "@/types/report";

interface Props {
  faceShape: FaceShape | undefined;
  colorSeason: ColorSeason | undefined;
  userName?: string;
  reportId: string;
  className?: string;
}

const SEASON_EMOJIS: Record<string, string> = {
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍂",
  Winter: "❄️",
  "Soft Spring": "🌸",
  "Soft Summer": "☀️",
  "Soft Autumn": "🍂",
  "Deep Winter": "❄️",
  "Deep Autumn": "🍂",
  "Bright Spring": "🌸",
  "Bright Winter": "❄️",
  "Light Spring": "🌸",
  "Light Summer": "☀️",
};

const SEASON_COLORS: Record<string, string> = {
  Spring: "#F4A460",
  Summer: "#B0C4DE",
  Autumn: "#8B4513",
  Winter: "#4682B4",
  "Soft Spring": "#DEB887",
  "Soft Summer": "#B0C4DE",
  "Soft Autumn": "#A0522D",
  "Deep Winter": "#191970",
  "Deep Autumn": "#5C4033",
  "Bright Spring": "#FF6347",
  "Bright Winter": "#4169E1",
  "Light Spring": "#FFE4B5",
  "Light Summer": "#E6E6FA",
};

export function SeasonShareCard({
  faceShape,
  colorSeason,
  userName,
  reportId,
  className = "",
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = React.useState(false);
  const [shareCardBlob, setShareCardBlob] = React.useState<Blob | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const season = colorSeason ?? "Unknown";
  const shape = faceShape ?? "Unknown";
  const seasonColor = SEASON_COLORS[season] ?? "#C17A5F";
  const emoji = SEASON_EMOJIS[season] ?? "✨";

  async function generateCard(): Promise<Blob> {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    const brandColor = "#C17A5F";
    const bg = "#1A1412";

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, bg);
    grad.addColorStop(0.5, "#2A1F1A");
    grad.addColorStop(1, bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative rings
    ctx.strokeStyle = `${brandColor}20`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 120 + i * 80, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Accent line
    ctx.fillStyle = brandColor;
    ctx.fillRect(w * 0.15, 130, w * 0.7, 2);

    // Brand
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Fraunces', serif";
    ctx.textAlign = "center";
    ctx.fillText("RENOVAARA", w / 2, 110);

    // Emoji badge
    ctx.font = "64px serif";
    ctx.fillText(emoji, w / 2, 230);

    // Season
    ctx.fillStyle = seasonColor;
    ctx.font = "bold 28px 'Fraunces', serif";
    ctx.fillText(season, w / 2, 285);

    // Face shape
    ctx.fillStyle = "#D4C5B5";
    ctx.font = "18px 'Instrument Sans', sans-serif";
    ctx.fillText(`${shape} face shape`, w / 2, 320);

    // Tagline
    ctx.fillStyle = "#A09080";
    ctx.font = "14px 'Instrument Sans', sans-serif";
    ctx.fillText("AI-Powered Beauty Analysis", w / 2, 370);

    // Bottom accent line
    ctx.fillStyle = brandColor;
    ctx.fillRect(w * 0.3, 390, w * 0.4, 1);

    // URL
    ctx.fillStyle = "#706050";
    ctx.font = "12px 'Instrument Sans', sans-serif";
    ctx.fillText("renovaara.in", w / 2, 420);

    // User name (optional)
    if (userName) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "15px 'Instrument Sans', sans-serif";
      ctx.fillText(userName, w / 2, 160);
    }

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const blob = await generateCard();
      setShareCardBlob(blob);
      track("generate_share_card", { faceShape: shape, season });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!shareCardBlob) await handleGenerate();
    const blob = shareCardBlob!;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Renovaara-${season.replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback("Image saved!");
    track("download_share_card", { faceShape: shape, season });
    setTimeout(() => setFeedback(null), 2500);
  }

  async function handleNativeShare() {
    if (!shareCardBlob) await handleGenerate();
    const blob = shareCardBlob!;
    try {
      const file = new File([blob], `Renovaara-${season}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `My ${season} beauty analysis`,
          text: `I'm a ${season}! Discover your color season at Renovaara ✨`,
          files: [file],
        });
        track("share_card", { platform: "native", faceShape: shape, season });
      }
    } catch {
      // user cancelled
    }
  }

  const reportUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/report/${reportId}`
      : "";

  return (
    <div className={`${className}`}>
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} width={500} height={480} className="hidden" />

      {/* Preview */}
      {shareCardBlob && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={URL.createObjectURL(shareCardBlob)}
            alt={`Share card: ${season} color season`}
            className="w-full"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-[var(--btn-fg)] disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {shareCardBlob ? "Download card" : "Generate share card"}
        </button>

        {typeof navigator !== "undefined" && navigator.canShare?.() && (
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 bg-terracotta/10 px-5 py-2.5 text-sm font-semibold text-terracotta disabled:opacity-60"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}

        {shareCardBlob && (
          <span className="text-xs text-ink-mist">
            Post on Instagram, TikTok, or WhatsApp!
          </span>
        )}
      </div>

      {feedback && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-sage">
          <Check className="h-3.5 w-3.5" />
          {feedback}
        </p>
      )}

      {/* Quick share to social */}
      {shareCardBlob && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-ink-stone">Share on:</span>
          {[
            { id: "twitter", label: "X" },
            { id: "whatsapp", label: "WhatsApp" },
            { id: "telegram", label: "Telegram" },
          ].map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => {
                const text = `I'm a ${season}! Discover your color season at Renovaara ✨`;
                const urls: Record<string, string> = {
                  twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reportUrl)}`,
                  whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + reportUrl)}`,
                  telegram: `https://t.me/share/url?url=${encodeURIComponent(reportUrl)}&text=${encodeURIComponent(text)}`,
                };
                window.open(urls[target.id], "_blank", "noopener,noreferrer,width=600,height=640");
                track("share_card", { platform: target.id, faceShape: shape, season });
              }}
              className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium hover:bg-blush/40"
            >
              {target.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
