"use client";

import * as React from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CanvasShareButton({ canvasId, initialShareUrl }: { canvasId: string; initialShareUrl?: string | null }) {
  const [shareUrl, setShareUrl] = React.useState<string | null>(initialShareUrl ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId }),
      });
      const json = await res.json() as { shareUrl?: string; error?: string };
      if (!res.ok || !json.shareUrl) throw new Error(json.error || "Failed to create share link");
      setShareUrl(json.shareUrl);
      await navigator.clipboard.writeText(json.shareUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId }),
      });
      if (!res.ok) throw new Error("Failed to revoke share link");
      setShareUrl(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(17,24,39,0.12)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Share</p>
          <p className="text-sm text-ink-stone">Create a public canvas link like a report share.</p>
        </div>
        <Button onClick={createShare} disabled={loading} variant="accent" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          {shareUrl ? "Copy link" : "Create link"}
        </Button>
      </div>

      {shareUrl && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm" style={{ background: "rgba(17,24,39,0.08)" }}>
          <span className="truncate text-ink-stone">{shareUrl}</span>
          <button onClick={() => void navigator.clipboard.writeText(shareUrl)} className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      )}

      {shareUrl && (
        <button onClick={revokeShare} disabled={loading} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink-stone hover:text-ink">
          <Trash2 className="h-3.5 w-3.5" /> Revoke link
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}