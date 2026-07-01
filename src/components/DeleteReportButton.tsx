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

  React.useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  async function handleDelete() {
    if (!confirmed) {
      setError(null);
      setConfirmed(true);
      timeoutRef.current = setTimeout(() => setConfirmed(false), 5000);
      return;
    }

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
      <span className="error-banner flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs">
        {error}
      </span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      aria-label={confirmed ? "Confirm deletion" : "Delete report"}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-40 ${
        confirmed
          ? "border-red-300 bg-red-50 text-red-600"
          : "border-[var(--color-border)] bg-blush/40 text-ink-mist hover:text-ink-stone"
      }`}
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
