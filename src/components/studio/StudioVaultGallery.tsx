"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StyleMomentShare } from "@/components/StyleMomentShare";

type VaultAsset = {
  id: string;
  tool: string;
  variant: string | null;
  imageUrl: string | null;
  created_at: string;
  studio_canvas_id: string | null;
  report_id: string | null;
  meta?: { sourceImageUrl?: string } | null;
};

type Filter = "all" | "makeup" | "hair" | "outfit";

function toolMatchesFilter(tool: string, filter: Filter): boolean {
  if (filter === "all") return true;
  const t = tool.toLowerCase();
  if (filter === "makeup") return t.includes("makeup");
  if (filter === "hair") return t.includes("hair");
  if (filter === "outfit") return t.includes("outfit") || t.includes("clothing") || t.includes("virtual");
  return true;
}

export function StudioVaultGallery({ assets }: { assets: VaultAsset[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [shareAsset, setShareAsset] = React.useState<VaultAsset | null>(null);

  const filtered = assets.filter((a) => toolMatchesFilter(a.tool, filter));
  const counts = {
    all: assets.length,
    makeup: assets.filter((a) => toolMatchesFilter(a.tool, "makeup")).length,
    hair: assets.filter((a) => toolMatchesFilter(a.tool, "hair")).length,
    outfit: assets.filter((a) => toolMatchesFilter(a.tool, "outfit")).length,
  };

  if (assets.length === 0) {
    return (
      <div className="rounded-3xl p-12 text-center" style={{ background: "rgba(251,231,242,0.5)", border: "1px dashed rgba(17,24,39,0.14)" }}>
        <p className="text-ink-stone mb-4">Your first look is one selfie away.</p>
        <Button asChild variant="accent" size="lg">
          <Link href="/studio">Try a look free</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {(["all", "makeup", "hair", "outfit"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="rounded-full px-4 py-2 text-sm font-medium transition-all capitalize"
            style={{
              background: filter === key ? "#111827" : "rgba(251,231,242,0.5)",
              color: filter === key ? "#fff" : "#3D2B1F",
              border: `1px solid ${filter === key ? "#111827" : "rgba(17,24,39,0.14)"}`,
            }}
          >
            {key === "all" ? "All" : key}
            {counts[key] > 0 ? <span className="ml-2 text-xs opacity-70">({counts[key]})</span> : null}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((asset) => {
          const sourceUrl = asset.meta?.sourceImageUrl ?? null;
          return (
            <div
              key={asset.id}
              className="overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: "#E8DDD0" }}
            >
              <div className="grid grid-cols-2 gap-0.5 bg-[#F0E8DF]">
                {sourceUrl && asset.imageUrl ? (
                  <>
                    <div className="relative aspect-square">
                      <Image src={sourceUrl} alt="Before" fill unoptimized className="object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">Before</span>
                    </div>
                    <div className="relative aspect-square">
                      <Image src={asset.imageUrl} alt="After" fill unoptimized className="object-cover" />
                      <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">After</span>
                    </div>
                  </>
                ) : (
                  <div className="relative col-span-2 aspect-square bg-gray-100">
                    {asset.imageUrl ? (
                      <Image src={asset.imageUrl} alt={asset.tool} fill unoptimized className="object-cover" />
                    ) : null}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
                  {asset.tool}
                </p>
                <p className="mt-1 text-xs text-ink-stone">
                  {new Date(asset.created_at).toLocaleDateString("en-IN")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {asset.studio_canvas_id ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/studio/${asset.studio_canvas_id}`}>Open in Studio</Link>
                    </Button>
                  ) : asset.report_id ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/report/${asset.report_id}?tab=try-shop`}>Open report</Link>
                    </Button>
                  ) : null}
                  {asset.imageUrl ? (
                    <Button asChild size="sm" variant="ghost">
                      <a href={asset.imageUrl} download>
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </a>
                    </Button>
                  ) : null}
                  {sourceUrl && asset.imageUrl ? (
                    <Button size="sm" variant="ghost" onClick={() => setShareAsset(asset)}>
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {shareAsset?.imageUrl && shareAsset.meta?.sourceImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(17,24,39,0.5)" }}
          onClick={() => setShareAsset(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold">Share your moment</p>
            <StyleMomentShare
              beforeUrl={shareAsset.meta.sourceImageUrl}
              afterUrl={shareAsset.imageUrl}
            />
            <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => setShareAsset(null)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
