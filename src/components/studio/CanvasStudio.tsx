"use client";

import * as React from "react";
import { Check, History, Loader2, Palette, ScanFace, Shirt, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudioEntitlement, StudioOutfitResult } from "@/types/report";
import { MAKEUP_STYLES, MAKEUP_STYLE_LABELS, MAKEUP_INTENSITIES, MAKEUP_INTENSITY_LABELS } from "@/lib/makeup-options";
import { type HairGender, type HairStyleValue, getHairStyleOptionsForGender } from "@/lib/hair-options";

type VaultItem = {
  id: string;
  sourceType: "canvas" | "report";
  sourceId: string | null;
  tool: string;
  variant: string | null;
  imageUrl: string | null;
  createdAt: string;
};

type ColorScanResult = {
  season?: string;
  palette?: { name: string; hex: string }[];
  avoidColors?: { name: string; hex: string }[];
};

type CanvasResult = {
  lowResUrl: string;
  hdUrl: string;
  asset?: { id: string; createdAt: string } | null;
  outfit?: StudioOutfitResult;
};

const HAIR_COLORS = [
  "natural",
  "blonde",
  "brunette",
  "black",
  "auburn",
  "copper",
  "caramel",
  "burgundy",
  "rose gold",
] as const;

const OCCASIONS = ["casual", "work", "date", "party", "travel", "formal"] as const;
const VIBES = ["minimal", "romantic", "street", "classic", "bold", "soft glam"] as const;

export function CanvasStudio({
  canvasId,
  photoUrl,
  studioEntitlement,
  detectedGender = "none",
  initialSourceAssetId = null,
}: {
  canvasId: string;
  photoUrl: string;
  studioEntitlement?: StudioEntitlement;
  detectedGender?: HairGender;
  initialSourceAssetId?: string | null;
}) {
  const [mode, setMode] = React.useState<"scan" | "makeup" | "hair" | "outfit">("scan");
  const [scanLoading, setScanLoading] = React.useState(false);
  const [generateLoading, setGenerateLoading] = React.useState(false);
  const [vaultLoading, setVaultLoading] = React.useState(false);
  const [vault, setVault] = React.useState<VaultItem[]>([]);
  const [sourceAssetId, setSourceAssetId] = React.useState<string | null>(initialSourceAssetId);
  const [sourcePreviewUrl, setSourcePreviewUrl] = React.useState<string>(photoUrl);
  const [selectedPalette, setSelectedPalette] = React.useState<ColorScanResult | null>(null);
  const [makeupStyle, setMakeupStyle] = React.useState<(typeof MAKEUP_STYLES)[number]>("natural");
  const [makeupIntensity, setMakeupIntensity] = React.useState<(typeof MAKEUP_INTENSITIES)[number]>("medium");
  const hairStyleOptions = React.useMemo(() => getHairStyleOptionsForGender(detectedGender), [detectedGender]);
  const [hairStyle, setHairStyle] = React.useState<HairStyleValue>("No change");
  const [hairColor, setHairColor] = React.useState<(typeof HAIR_COLORS)[number]>("natural");
  const [occasion, setOccasion] = React.useState<(typeof OCCASIONS)[number]>("casual");
  const [vibe, setVibe] = React.useState<(typeof VIBES)[number]>("minimal");
  const [scanResult, setScanResult] = React.useState<ColorScanResult | null>(null);
  const [result, setResult] = React.useState<CanvasResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canGenerate =
    studioEntitlement == null
      ? true
      : studioEntitlement.remainingGens === null
        ? true
        : studioEntitlement.remainingGens > 0;

  const loadVault = React.useCallback(async () => {
    setVaultLoading(true);
    try {
      const res = await fetch("/api/studio/vault?limit=12&offset=0");
      if (!res.ok) return;
      const json = await res.json() as { assets?: VaultItem[] };
      setVault((json.assets ?? []).filter((item) => !!item.imageUrl));
    } catch {
      // Keep the canvas usable even if the vault is unavailable.
    } finally {
      setVaultLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadVault();
  }, [loadVault]);

  React.useEffect(() => {
    if (!hairStyleOptions.some((opt) => opt.value === hairStyle)) {
      setHairStyle("No change");
    }
  }, [hairStyle, hairStyleOptions]);

  const quickScan = async () => {
    setScanLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/scan-color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId }),
      });
      const json = await res.json() as { analysis?: ColorScanResult; error?: string };
      if (!res.ok || !json.analysis) throw new Error(json.error || "Quick scan failed");
      setScanResult(json.analysis);
      setSelectedPalette(json.analysis);
      setMode("makeup");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanLoading(false);
    }
  };

  const generate = async () => {
    if (mode === "scan") {
      await quickScan();
      return;
    }
    if (!canGenerate || generateLoading) return;
    setGenerateLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        contextType: "canvas",
        contextId: canvasId,
        mode,
        options: {
          sourceAssetId,
          colorScan: selectedPalette,
          occasion,
          vibe,
          makeupStyle,
          makeupIntensity,
          hairStyle,
          hairColor,
        },
      };

      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as CanvasResult & { error?: string };
      if (!res.ok) throw new Error(json.error || "Generation failed");

      setResult(json);
      await loadVault();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerateLoading(false);
    }
  };

  const selectSource = (item: VaultItem) => {
    setSourceAssetId(item.id);
    if (item.imageUrl) setSourcePreviewUrl(item.imageUrl);
  };

  return (
    <div className="space-y-6 rounded-3xl p-6 sm:p-8" style={{ background: "linear-gradient(180deg, rgba(255,247,251,0.96), rgba(254,251,248,0.96))", border: "1px solid rgba(131,24,67,0.12)" }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="section-label inline-flex">Canvas Studio</span>
            {selectedPalette?.season && (
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "rgba(236,72,153,0.10)", color: "#EC4899" }}>{selectedPalette.season}</span>
            )}
          </div>
          <h2 className="font-serif text-3xl text-ink">Quick scan, try-on, wardrobe ideas.</h2>
          <p className="max-w-2xl text-sm text-ink-stone">Use the quick scan to lock in palette guidance, then try makeup, hair, or outfit concepts. Reuse any previous look from your vault as the source image.</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "rgba(131,24,67,0.04)", border: "1px solid rgba(131,24,67,0.10)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Quota</p>
          <p className="text-sm text-ink-stone mt-1">{studioEntitlement?.tier === "studio_pro" ? "Unlimited with Studio Pro" : `${studioEntitlement?.remainingGens ?? 0} generations left this month`}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { key: "scan", label: "Quick Scan", icon: ScanFace },
              { key: "makeup", label: "Makeup", icon: Wand2 },
              { key: "hair", label: "Hair", icon: Palette },
              { key: "outfit", label: "Outfit", icon: Shirt },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setMode(tab.key as typeof mode)}
                  className="rounded-2xl p-4 text-left transition-all"
                  style={{
                    background: active ? "rgba(236,72,153,0.10)" : "rgba(255,255,255,0.70)",
                    border: active ? "1px solid rgba(236,72,153,0.24)" : "1px solid rgba(131,24,67,0.12)",
                  }}
                >
                  <Icon className="h-5 w-5 mb-2" style={{ color: active ? "#EC4899" : "#9C7D5B" }} />
                  <p className="text-sm font-semibold text-ink">{tab.label}</p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(131,24,67,0.12)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9C7D5B" }}>Source Image</p>
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(131,24,67,0.10)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sourcePreviewUrl || photoUrl} alt="Source" className="w-full h-auto" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-ink-stone">{sourceAssetId ? "Using a previous vault look" : "Using the original canvas selfie"}</p>
                <Button size="sm" variant="ghost" onClick={() => { setSourceAssetId(null); setSourcePreviewUrl(photoUrl); }}>
                  Reset
                </Button>
              </div>
            </div>

            <div className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(131,24,67,0.12)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9C7D5B" }}>Quick Scan</p>
              {scanResult?.palette?.length ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {scanResult.palette.slice(0, 8).map((item) => (
                      <span key={item.hex} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ background: item.hex }}>
                        {item.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-ink-stone">Use this palette to guide makeup and outfit generation.</p>
                </div>
              ) : (
                <p className="text-sm text-ink-stone">Run the quick scan to generate a 5-second palette picker.</p>
              )}
              <Button onClick={quickScan} disabled={scanLoading} className="mt-4 w-full" variant="accent">
                {scanLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</> : <><Check className="h-4 w-4 mr-2" /> Quick Scan</>}
              </Button>
            </div>
          </div>

          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(131,24,67,0.12)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#9C7D5B" }}>Generation Controls</p>

            {mode === "makeup" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-ink-stone">Makeup Style</span>
                  <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={makeupStyle} onChange={(e) => setMakeupStyle(e.target.value as typeof makeupStyle)}>
                    {MAKEUP_STYLES.map((style) => <option key={style} value={style}>{MAKEUP_STYLE_LABELS[style]}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-ink-stone">Intensity</span>
                  <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={makeupIntensity} onChange={(e) => setMakeupIntensity(e.target.value as typeof makeupIntensity)}>
                    {MAKEUP_INTENSITIES.map((value) => <option key={value} value={value}>{MAKEUP_INTENSITY_LABELS[value]}</option>)}
                  </select>
                </label>
              </div>
            )}

            {mode === "hair" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-ink-stone">Hair Style</span>
                  <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={hairStyle} onChange={(e) => setHairStyle(e.target.value as typeof hairStyle)}>
                    {hairStyleOptions.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-ink-stone">Hair Color</span>
                  <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={hairColor} onChange={(e) => setHairColor(e.target.value as typeof hairColor)}>
                    {HAIR_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
                  </select>
                </label>
              </div>
            )}

            {mode === "outfit" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-ink-stone">Occasion</span>
                  <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={occasion} onChange={(e) => setOccasion(e.target.value as typeof occasion)}>
                    {OCCASIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-ink-stone">Vibe</span>
                  <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={vibe} onChange={(e) => setVibe(e.target.value as typeof vibe)}>
                    {VIBES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
            )}

            <Button onClick={generate} disabled={mode === "scan" ? scanLoading : (!canGenerate || generateLoading)} className="mt-5 w-full" variant="accent" size="lg">
              {generateLoading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                : <><Sparkles className="h-4 w-4 mr-2" /> {mode === "scan" ? "Run Quick Scan" : `Generate ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}</>}
            </Button>
          </div>

          {result && (
            <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(131,24,67,0.12)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#9C7D5B" }}>Latest Result</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.hdUrl || result.lowResUrl} alt="Result" className="w-full rounded-2xl border" style={{ borderColor: "rgba(131,24,67,0.10)" }} />
              {result.outfit && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-ink">{result.outfit.summary}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {result.outfit.looks.slice(0, 3).map((look) => (
                      <div key={look.title} className="rounded-2xl p-3" style={{ background: "rgba(251,231,242,0.55)" }}>
                        <p className="text-sm font-semibold text-ink">{look.title}</p>
                        <p className="text-xs text-ink-stone mt-1">{look.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(131,24,67,0.12)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Vault Sources</p>
              {vaultLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setSourceAssetId(null); setSourcePreviewUrl(photoUrl); }}
                className="overflow-hidden rounded-2xl border text-left"
                style={{ borderColor: sourceAssetId ? "rgba(131,24,67,0.12)" : "rgba(236,72,153,0.36)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Original selfie" className="aspect-square w-full object-cover" />
                <div className="p-2 text-xs font-medium text-ink">Original selfie</div>
              </button>
              {vault.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectSource(item)}
                  className="overflow-hidden rounded-2xl border text-left"
                  style={{ borderColor: sourceAssetId === item.id ? "rgba(236,72,153,0.36)" : "rgba(131,24,67,0.12)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl ?? ""} alt={item.tool} className="aspect-square w-full object-cover" />
                  <div className="p-2 text-xs font-medium text-ink">
                    {item.tool}
                    {item.variant ? <span className="ml-1 text-ink-stone">· {item.variant}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(131,24,67,0.12)" }}>
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4" style={{ color: "#9C7D5B" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Scan Notes</p>
            </div>
            {scanResult?.season ? <p className="text-sm text-ink-stone">Season: {scanResult.season}</p> : <p className="text-sm text-ink-stone">Run the quick scan to populate color guidance.</p>}
          </div>
        </aside>
      </div>

      {error && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "rgba(248,113,113,0.10)", color: "#B91C1C" }}>
          {error}
        </div>
      )}
    </div>
  );
}