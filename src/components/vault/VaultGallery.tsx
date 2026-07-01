"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, Camera, Loader2, Sparkles } from "lucide-react";
import type { VaultItem, VaultResponse } from "@/types/vault";
import { VaultAssetCard } from "./VaultAssetCard";
import { Button } from "@/components/ui/button";
import styles from "@/app/dashboard/dashboard.module.css";

type Filter = "all" | "uploads" | "analysis";

export function VaultGallery() {
  const [data, setData] = React.useState<VaultResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vault", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load vault");
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered: VaultItem[] = React.useMemo(() => {
    if (!data) return [];
    if (filter === "uploads") return data.items.filter((i) => i.kind === "upload");
    if (filter === "analysis") return data.items.filter((i) => i.kind === "analysis" || i.kind === "pdf");
    return data.items;
  }, [data, filter]);

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: data?.counts.all ?? 0 },
    { id: "uploads", label: "Uploads", count: data?.counts.uploads ?? 0 },
    { id: "analysis", label: "Analysis", count: data?.counts.analysis ?? 0 },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.id ? styles.tabActive : styles.tabInactive
            }`}
          >
            {tab.label}
            <span className="ml-1.5 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className={`flex flex-col items-center justify-center py-24 rounded-3xl ${styles.emptyState}`}>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-terracotta" />
          <p className="text-sm text-ink-stone">Loading your vault…</p>
        </div>
      )}

      {!loading && error && (
        <div className={`text-center py-16 rounded-3xl ${styles.emptyState}`}>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={`text-center py-24 rounded-3xl ${styles.emptyState}`}>
          <Archive className="mx-auto mb-4 h-12 w-12 text-terracotta/40" />
          <h2 className="font-display text-2xl text-ink mb-2">Your vault is empty</h2>
          <p className="text-ink-stone mb-6 max-w-md mx-auto">
            Upload a selfie to generate analyses. Your photos and infographic results will appear here for download and sharing.
          </p>
          <Button asChild variant="accent">
            <Link href="/upload">
              <Camera className="h-4 w-4" />
              Start an analysis
            </Link>
          </Button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <VaultAssetCard key={item.id} item={item} onDeleted={load} />
          ))}
        </div>
      )}

      {!loading && !error && (data?.counts.all ?? 0) > 0 && (
        <p className="mt-10 text-center text-xs text-ink-stone flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Signed links refresh hourly — download to keep a permanent copy. You can delete selfies and generated images anytime; your report text stays in your dashboard.
        </p>
      )}
    </div>
  );
}
