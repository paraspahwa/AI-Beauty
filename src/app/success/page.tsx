"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function SuccessPage() {
  return (
    <React.Suspense fallback={<main className="container max-w-md py-32 text-center" />}>
      <SuccessInner />
    </React.Suspense>
  );
}

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const reportId = params.get("reportId");

  useEffect(() => {
    if (!reportId) return;
    const t = setTimeout(() => router.push(`/report/${reportId}`), 2000);
    return () => clearTimeout(t);
  }, [reportId, router]);

  return (
    <main className="container max-w-md py-32 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent-deep">
        <Sparkles className="h-7 w-7" />
      </span>
      <h1 className="text-3xl text-ink">Payment successful!</h1>
      <p className="mt-2 text-sm text-ink-muted">Unlocking your full report…</p>
    </main>
  );
}
