"use client";

import * as React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear error after 4 s automatically
  React.useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  async function handleDelete() {
    if (!confirmed) {
      setError(null);
      setConfirmed(true);
      // Auto-reset confirmation state after 5 s if user doesn't click again
      timeoutRef.current = setTimeout(() => setConfirmed(false), 5000);
      return;
    }

    // User confirmed — cancel the auto-reset timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/delete`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `Delete failed (${res.status})`);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
      setConfirmed(false);
    }
  }

  if (error) {
    return (
      <span
        className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
        style={{
          background: "rgba(248,113,113,0.12)",
          border: "1px solid rgba(248,113,113,0.3)",
          color: "#F87171",
        }}
      >
        {error}
      </span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      aria-label={confirmed ? "Confirm deletion" : "Delete report"}
      className="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-40"
      style={{
        background: confirmed ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${confirmed ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.08)"}`,
        color: confirmed ? "#F87171" : "rgba(240,232,216,0.35)",
      }}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {confirmed && !pending && <span>Confirm?</span>}
    </button>
  );
}
