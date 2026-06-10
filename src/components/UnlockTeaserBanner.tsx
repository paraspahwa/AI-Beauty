"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import {
  type OnboardingProgress,
  type UnlockTeaser,
  getUnlockTeaser,
  guestDismissTeaser,
  readGuestProgress,
} from "@/lib/progressive-unlock";

interface Props {
  guest?: boolean;
  hints?: { season?: string; faceShape?: string };
  /** When provided, use this teaser directly (e.g. right after generation). */
  teaser?: UnlockTeaser | null;
  className?: string;
}

export function UnlockTeaserBanner({ guest = false, hints, teaser: teaserProp, className = "" }: Props) {
  const [teaser, setTeaser] = React.useState<UnlockTeaser>({ type: "none" });
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (teaserProp && teaserProp.type !== "none") {
      setTeaser(teaserProp);
      setVisible(true);
      return;
    }

    if (guest) {
      const progress = readGuestProgress();
      const t = getUnlockTeaser(progress, hints);
      setTeaser(t);
      setVisible(t.type !== "none");
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/studio/progress", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json() as { teaser?: UnlockTeaser; progress?: OnboardingProgress };
        if (json.teaser && json.teaser.type !== "none") {
          setTeaser(json.teaser);
          setVisible(true);
        }
      } catch {
        // ignore
      }
    })();
  }, [guest, hints, teaserProp]);

  if (!visible || teaser.type === "none") return null;

  function handleDismiss() {
    if (guest) {
      guestDismissTeaser();
    } else {
      void fetch("/api/studio/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      }).catch(() => undefined);
    }
    setVisible(false);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(253,250,246,0.98), rgba(251,231,242,0.92))",
        borderColor: "rgba(17,24,39,0.12)",
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 transition-opacity hover:opacity-70"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" style={{ color: "#9C7D5B" }} />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(17,24,39,0.08)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "#111827" }} />
        </div>
        <div>
          <p className="text-sm leading-relaxed" style={{ color: "#3D2B1F" }}>
            {teaser.message}
          </p>
          <Link
            href={teaser.ctaHref}
            className="mt-2 inline-flex text-sm font-semibold underline-offset-2 hover:underline"
            style={{ color: "#111827" }}
          >
            {teaser.ctaLabel} →
          </Link>
        </div>
      </div>
    </div>
  );
}
