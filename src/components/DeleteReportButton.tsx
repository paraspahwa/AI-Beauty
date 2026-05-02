"use client";

import * as React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true);
      // Auto-reset confirmation state after 3 s if user doesn't click again
      setTimeout(() => setConfirmed(false), 3000);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/delete`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
      setConfirmed(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title={confirmed ? "Click again to confirm deletion" : "Delete report"}
      className="shrink-0 flex items-center justify-center rounded-lg p-2 transition-colors hover:opacity-80 disabled:opacity-40"
      style={{
        background: confirmed ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${confirmed ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.08)"}`,
        color: confirmed ? "#F87171" : "rgba(240,232,216,0.35)",
      }}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
