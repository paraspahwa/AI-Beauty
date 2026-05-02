"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminCleanupButton() {
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{ expired: number } | null>(null);

  async function handleCleanup() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholdMinutes: 10 }),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleCleanup} disabled={pending} variant="outline" size="sm">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Expire stuck reports
      </Button>
      {result !== null && (
        <span className="text-xs text-ink-stone">
          {result.expired === 0 ? "No stuck reports found." : `Expired ${result.expired} stuck report${result.expired !== 1 ? "s" : ""}.`}
        </span>
      )}
    </div>
  );
}
