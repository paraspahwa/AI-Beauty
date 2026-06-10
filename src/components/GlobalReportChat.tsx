"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { StyleChatDrawer } from "@/components/StyleChatDrawer";
import type { CompiledReport } from "@/types/report";

type LatestReportPayload = {
  id: string;
  isPaid: boolean;
  partial: Partial<CompiledReport>;
};

const SKIP_PREFIXES = ["/report/", "/r/", "/m/", "/c/", "/auth"];

export function GlobalReportChat() {
  const pathname = usePathname();
  const [latest, setLatest] = React.useState<LatestReportPayload | null>(null);

  const skip = SKIP_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  React.useEffect(() => {
    if (skip) {
      setLatest(null);
      return;
    }

    let cancelled = false;
    void fetch("/api/reports/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { report?: LatestReportPayload | null } | null) => {
        if (!cancelled && data?.report?.id) setLatest(data.report);
      })
      .catch(() => {
        if (!cancelled) setLatest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [skip, pathname]);

  if (skip || !latest) return null;

  return (
    <StyleChatDrawer
      reportId={latest.id}
      report={latest.partial}
      previewMode={!latest.isPaid}
    />
  );
}
