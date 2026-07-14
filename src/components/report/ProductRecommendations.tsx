"use client";

import * as React from "react";
import { ShoppingBag, ExternalLink } from "lucide-react";
import type { ColorSeason } from "@/types/report";

interface Props {
  colorSeason: ColorSeason | undefined;
  faceShape?: string;
}

interface Product {
  name: string;
  price: string;
  image: string;
  url: string;
  reason: string;
}

const SEASON_RECS: Record<string, { lipstick: string; eyeshadow: string; blush: string }> = {
  Spring: { lipstick: "Coral", eyeshadow: "Peach", blush: "Warm pink" },
  Summer: { lipstick: "Rose", eyeshadow: "Lavender", blush: "Cool pink" },
  Autumn: { lipstick: "Terracotta", eyeshadow: "Bronze", blush: "Warm peach" },
  Winter: { lipstick: "Berry", eyeshadow: "Silver/Slate", blush: "Cool rose" },
  "Soft Spring": { lipstick: "Apricot", eyeshadow: "Soft peach", blush: "Warm pink" },
  "Soft Summer": { lipstick: "Mauve", eyeshadow: "Dusty lavender", blush: "Soft rose" },
  "Soft Autumn": { lipstick: "Muted coral", eyeshadow: "Warm taupe", blush: "Peach" },
  "Deep Winter": { lipstick: "Burgundy", eyeshadow: "Charcoal", blush: "Deep rose" },
  "Deep Autumn": { lipstick: "Rust", eyeshadow: "Copper", blush: "Warm bronze" },
  "Bright Spring": { lipstick: "Bright coral", eyeshadow: "Golden", blush: "Warm pink" },
  "Bright Winter": { lipstick: "Fuchsia", eyeshadow: "Icy silver", blush: "Cool berry" },
  "Light Spring": { lipstick: "Pale peach", eyeshadow: "Soft gold", blush: "Light pink" },
  "Light Summer": { lipstick: "Soft rose", eyeshadow: "Lilac", blush: "Baby pink" },
};

export function ProductRecommendations({ colorSeason, faceShape }: Props) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    if (!colorSeason) return;

    const recs = SEASON_RECS[colorSeason];
    if (!recs) return;

    // Generate product recommendations based on season
    const suggested: Product[] = [
      {
        name: `${recs.lipstick} Lipstick`,
        price: "₹450 - ₹2,500",
        image: "",
        url: `https://www.amazon.in/s?k=${encodeURIComponent(recs.lipstick + " lipstick for " + colorSeason + " skin tone")}&tag=${typeof window !== "undefined" ? (window as any).__AMAZON_TAG || "renovaara-21" : "renovaara-21"}`,
        reason: `Perfect ${recs.lipstick.toLowerCase()} shade for ${colorSeason} season`,
      },
      {
        name: `${recs.eyeshadow} Eyeshadow`,
        price: "₹350 - ₹2,000",
        image: "",
        url: `https://www.amazon.in/s?k=${encodeURIComponent(recs.eyeshadow + " eyeshadow palette")}&tag=renovaara-21`,
        reason: `Recommended ${recs.eyeshadow.toLowerCase()} tones for your palette`,
      },
      {
        name: `${recs.blush} Blush`,
        price: "₹250 - ₹1,800",
        image: "",
        url: `https://www.amazon.in/s?k=${encodeURIComponent(recs.blush + " blush")}&tag=renovaara-21`,
        reason: `Complementary ${recs.blush.toLowerCase()} shade for your undertone`,
      },
      ...(faceShape
        ? [
            {
              name: `Glasses for ${faceShape} Face`,
              price: "₹500 - ₹3,000",
              image: "",
              url: `https://www.amazon.in/s?k=${encodeURIComponent("glasses for " + faceShape + " face shape")}&tag=renovaara-21`,
              reason: `Frames curated for ${faceShape} face shapes`,
            } as Product,
          ]
        : []),
    ];

    setProducts(suggested);
  }, [colorSeason, faceShape]);

  if (!colorSeason || products.length === 0) return null;

  const displayed = showAll ? products : products.slice(0, 2);

  return (
    <div className="report-surface-panel rounded-3xl border border-terracotta/10 p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta/10">
          <ShoppingBag className="h-5 w-5 text-terracotta" />
        </div>
        <div>
          <p className="foil-label mb-0.5 border-none p-0">Shop your season</p>
          <h3 className="font-display text-lg text-ink">Product Recommendations</h3>
        </div>
      </div>
      <p className="mb-4 text-xs text-ink-stone">
        Discover products that complement your {colorSeason} colour season. We may earn a small commission
        from purchases — at no extra cost to you.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {displayed.map((product, i) => (
          <a
            key={i}
            href={product.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 transition hover:border-terracotta/30 hover:bg-blush/30"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-terracotta/5 text-xs text-ink-mist">
              🛍️
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{product.name}</p>
              <p className="mt-0.5 text-xs text-ink-mist">{product.price}</p>
              <p className="mt-1 text-[11px] text-ink-stone">{product.reason}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-terracotta">
                <ExternalLink className="h-3 w-3" />
                Shop on Amazon
              </span>
            </div>
          </a>
        ))}
      </div>
      {products.length > 2 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full rounded-xl border border-[var(--color-border)] py-2 text-xs font-medium text-ink-stone hover:bg-blush/30"
        >
          {showAll ? "Show less" : `Show all ${products.length} products`}
        </button>
      )}
      <p className="mt-3 text-[11px] text-ink-mist">
        As an Amazon Associate, Renovaara earns from qualifying purchases.
      </p>
    </div>
  );
}
