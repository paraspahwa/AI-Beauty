"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import {
  buildInfographicDownloadName,
  downloadInfographicImage,
} from "@/lib/vault/infographic-download";

interface Props {
  signedUrl: string;
  sectionKey: string;
  mime?: string;
  createdAt?: string;
  /** Short label for the button, e.g. "Skin Analysis" */
  label: string;
  className?: string;
}

export function InfographicDownloadButton({
  signedUrl,
  sectionKey,
  mime,
  createdAt,
  label,
  className = "",
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setFeedback(null);
    try {
      const name = buildInfographicDownloadName(sectionKey, mime, createdAt);
      await downloadInfographicImage(signedUrl, name);
      setFeedback("Saved");
      window.setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback("Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col items-stretch gap-1 sm:items-end ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDownload()}
        className="group inline-flex items-center justify-center gap-2 rounded-full border border-terracotta/35 bg-[var(--report-photo-bg)] px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-terracotta hover:bg-terracotta/10 disabled:opacity-60"
        aria-label={`Download ${label}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-terracotta" />
        ) : (
          <Download className="h-4 w-4 shrink-0 text-terracotta transition group-hover:scale-105" />
        )}
        <span>{busy ? "Downloading…" : `Download ${label}`}</span>
      </button>
      {feedback && (
        <span className="text-center text-[11px] font-medium text-ink-stone sm:text-right">
          {feedback}
        </span>
      )}
    </div>
  );
}
