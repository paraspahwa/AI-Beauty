"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Copy, Check, Sparkles, Palette, Droplets, Scissors, Eye } from "lucide-react";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  SkinAnalysisResult,
  HairstyleResult,
} from "@/types/report";

// ── Season trait summaries ────────────────────────────────────────────────────
const SEASON_TRAITS: Record<string, { keywords: string[]; vibe: string }> = {
  "Spring":        { keywords: ["warm", "bright", "fresh", "coral", "golden"],         vibe: "Warm & radiant — think sun-kissed florals" },
  "Light Spring":  { keywords: ["delicate", "warm", "light", "peach", "ivory"],        vibe: "Soft warmth — pastels and warm ivory shine on you" },
  "Warm Spring":   { keywords: ["vivid", "golden", "peachy", "energetic"],             vibe: "Golden energy — warm, saturated, joyful" },
  "Bright Spring": { keywords: ["vibrant", "high contrast", "coral", "turquoise"],     vibe: "High energy — bold brights with warm clarity" },
  "Summer":        { keywords: ["cool", "soft", "muted", "dusty", "romantic"],         vibe: "Cool & dreamy — soft rose and lavender tones" },
  "Soft Summer":   { keywords: ["muted", "cool", "dusty", "powder", "subtle"],         vibe: "Understated elegance — dusty, cool, sophisticated" },
  "Light Summer":  { keywords: ["airy", "cool", "pastel", "sky blue", "blush"],        vibe: "Light & airy — cool pastels with a gentle touch" },
  "Autumn":        { keywords: ["warm", "earthy", "muted", "rich", "golden"],          vibe: "Earthy warmth — terracotta, olive, and amber" },
  "Soft Autumn":   { keywords: ["muted", "warm", "taupe", "dusty sage", "gentle"],     vibe: "Gentle warmth — muted naturals and dusty earth" },
  "Deep Autumn":   { keywords: ["rich", "warm", "forest", "burgundy", "chocolate"],    vibe: "Deep & grounded — rich jewel tones with warmth" },
  "Warm Autumn":   { keywords: ["spicy", "golden", "rust", "olive", "camel"],          vibe: "Spiced warmth — rich amber and earthy rust" },
  "Winter":        { keywords: ["cool", "stark", "high contrast", "icy", "vivid"],     vibe: "Bold contrast — pure whites and jewel-tone depths" },
  "Deep Winter":   { keywords: ["dramatic", "dark", "cool", "rich", "jewel tones"],    vibe: "Dramatic depth — deep jewels and pure black" },
  "Cool Winter":   { keywords: ["icy", "crisp", "silver", "royal blue", "plum"],       vibe: "Crisp & regal — icy pastels and cool jewels" },
  "Bright Winter": { keywords: ["vivid", "cool", "electric", "fuchsia", "emerald"],    vibe: "Electric contrast — bright, cool, striking" },
};

// ── Face shape descriptions ───────────────────────────────────────────────────
const FACE_SHAPE_DESC: Record<string, string> = {
  Oval:     "Balanced and versatile — most styles work beautifully",
  Round:    "Soft and youthful — angular styles add definition",
  Square:   "Strong and structured — soft curves balance your angles",
  Heart:    "Delicate top, graceful jaw — chin-length styles shine",
  Diamond:  "High cheekbones, narrow forehead and jaw — rare and striking",
  Oblong:   "Elongated and elegant — width-adding styles suit you",
  Triangle: "Strong jaw, narrow forehead — top-volume styles balance",
  "Soft Oval": "Gently rounded oval — effortlessly versatile",
};

// ── Undertone descriptions ────────────────────────────────────────────────────
const UNDERTONE_DESC: Record<string, string> = {
  Warm:    "Golden or peachy — veins appear greenish, gold jewellery flatters",
  Cool:    "Pink or bluish — veins appear bluish-purple, silver jewellery flatters",
  Neutral: "A balance of warm and cool — both silver and gold work for you",
};

// ── Skin type descriptions ────────────────────────────────────────────────────
const SKIN_TYPE_DESC: Record<string, string> = {
  Oily:        "Excess sebum production — focus on balance and pore minimising",
  Dry:         "Low moisture — prioritise hydration and barrier repair",
  Combination: "T-zone oily, cheeks dry — zone-targeted routine works best",
  Sensitive:   "Reactive — fragrance-free, minimal-ingredient formulas are key",
  Normal:      "Well-balanced — maintain with light hydration and SPF",
};

// ── Prop types ────────────────────────────────────────────────────────────────
interface StylePrefsData {
  color_season: string | null;
  undertone: string | null;
  face_shape: string | null;
  skin_type: string | null;
  prefs: { metals?: string[]; palette?: string[] } | null;
  updated_at: string;
}

interface LatestReportData {
  id: string;
  created_at: string;
  color_analysis: ColorAnalysisResult | null;
  face_shape: FaceShapeResult | null;
  skin_analysis: SkinAnalysisResult | null;
  hairstyle: HairstyleResult | null;
}

interface Props {
  prefs: StylePrefsData | null;
  latest: LatestReportData | null;
  userEmail: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-2xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "#F0E8D8" }}>
        {value}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function StyleDnaCard({ prefs, latest, userEmail }: Props) {
  const [copied, setCopied] = React.useState(false);

  // Merge: prefs table (aggregated) wins for top-level fields, latest report fills detail
  const season    = prefs?.color_season ?? latest?.color_analysis?.season ?? null;
  const undertone = prefs?.undertone    ?? latest?.color_analysis?.undertone ?? null;
  const faceShape = prefs?.face_shape   ?? latest?.face_shape?.shape ?? null;
  const skinType  = prefs?.skin_type    ?? latest?.skin_analysis?.type ?? null;
  const metals    = prefs?.prefs?.metals ?? latest?.color_analysis?.metals ?? [];

  // Rich palette — prefer latest report (has names), fall back to prefs hex array
  const richPalette: { name: string; hex: string }[] =
    latest?.color_analysis?.palette?.slice(0, 5) ??
    (prefs?.prefs?.palette ?? []).map((hex, i) => ({ name: `Colour ${i + 1}`, hex }));

  const avoidColors = latest?.color_analysis?.avoidColors?.slice(0, 3) ?? [];
  const skinConcerns = latest?.skin_analysis?.concerns ?? [];
  const hairstyleNames = (latest?.hairstyle?.styles ?? []).slice(0, 3).map((s) => s.name);
  const seasonTraits = season ? (SEASON_TRAITS[season] ?? null) : null;

  async function copyStyleId() {
    const styleId = [
      season      ? `Season: ${season}` : null,
      undertone   ? `Undertone: ${undertone}` : null,
      faceShape   ? `Face: ${faceShape}` : null,
      skinType    ? `Skin: ${skinType}` : null,
      metals.length ? `Metals: ${metals.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    await navigator.clipboard.writeText(`✨ My StyleAI Profile\n${styleId}\n\nGet yours at styleai.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Hero identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(201,149,107,0.18) 0%, rgba(123,110,158,0.12) 60%, rgba(18,18,26,0.9) 100%)",
          border: "1px solid rgba(201,149,107,0.25)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Decorative glow */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #C9956B, transparent)" }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] font-semibold mb-1" style={{ color: "#C8A96E" }}>
                ✦ Style Identity
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl" style={{ color: "#F0E8D8" }}>
                {season ?? "Your Season"}
              </h2>
              {seasonTraits && (
                <p className="mt-1 text-sm italic" style={{ color: "rgba(240,232,216,0.55)" }}>
                  {seasonTraits.vibe}
                </p>
              )}
            </div>
            <button
              onClick={copyStyleId}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all hover:opacity-80 shrink-0"
              style={{ background: "rgba(201,149,107,0.2)", color: "#E8C990", border: "1px solid rgba(201,149,107,0.3)" }}
              title="Copy your style ID"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy ID"}
            </button>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {faceShape  && <StatPill label="Face Shape"  value={faceShape} />}
            {undertone  && <StatPill label="Undertone"   value={undertone} />}
            {skinType   && <StatPill label="Skin Type"   value={skinType} />}
            {metals.length > 0 && <StatPill label="Best Metal" value={metals[0]} />}
          </div>

          {/* Colour palette swatches */}
          {richPalette.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>
                Your colour palette
              </p>
              <div className="flex flex-wrap gap-2">
                {richPalette.map((c) => (
                  <div key={c.hex} className="flex items-center gap-1.5 group">
                    <div
                      className="h-7 w-7 rounded-full shadow-md transition-transform group-hover:scale-110"
                      style={{ background: c.hex, border: "2px solid rgba(255,255,255,0.12)" }}
                      title={c.name}
                    />
                    <span className="text-[11px] hidden sm:block" style={{ color: "rgba(240,232,216,0.45)" }}>
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Detail sections grid */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Color & Undertone */}
        {(season || undertone) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(201,149,107,0.07)", border: "1px solid rgba(201,149,107,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" style={{ color: "#C9956B" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9956B" }}>Colour Profile</p>
            </div>
            {season && (
              <div>
                <p className="text-[11px]" style={{ color: "rgba(240,232,216,0.4)" }}>Season</p>
                <p className="text-sm font-medium" style={{ color: "#F0E8D8" }}>{season}</p>
                {seasonTraits && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {seasonTraits.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-[10px] rounded-full px-2 py-0.5"
                        style={{ background: "rgba(201,149,107,0.15)", color: "#C9956B" }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {undertone && (
              <div>
                <p className="text-[11px]" style={{ color: "rgba(240,232,216,0.4)" }}>Undertone</p>
                <p className="text-sm font-medium" style={{ color: "#F0E8D8" }}>{undertone}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(240,232,216,0.45)" }}>
                  {UNDERTONE_DESC[undertone] ?? ""}
                </p>
              </div>
            )}
            {metals.length > 0 && (
              <div>
                <p className="text-[11px]" style={{ color: "rgba(240,232,216,0.4)" }}>Best metals</p>
                <p className="text-sm" style={{ color: "#F0E8D8" }}>{metals.join(" · ")}</p>
              </div>
            )}
            {avoidColors.length > 0 && (
              <div>
                <p className="text-[11px]" style={{ color: "rgba(240,232,216,0.4)" }}>Colours to avoid</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {avoidColors.map((c) => (
                    <div key={c.hex} className="flex items-center gap-1">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ background: c.hex, border: "1px solid rgba(255,255,255,0.15)" }}
                      />
                      <span className="text-[11px]" style={{ color: "rgba(240,232,216,0.5)" }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Face Shape */}
        {faceShape && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(123,110,158,0.07)", border: "1px solid rgba(123,110,158,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#A69CC4" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A69CC4" }}>Face Shape</p>
            </div>
            <div>
              <p className="font-serif text-xl" style={{ color: "#F0E8D8" }}>{faceShape}</p>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(240,232,216,0.55)" }}>
                {FACE_SHAPE_DESC[faceShape] ?? "Unique and striking features."}
              </p>
            </div>
            {latest?.face_shape?.traits && latest.face_shape.traits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {latest.face_shape.traits.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] rounded-full px-2 py-0.5"
                    style={{ background: "rgba(123,110,158,0.15)", color: "#A69CC4" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Skin Type */}
        {skinType && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(99,162,130,0.07)", border: "1px solid rgba(99,162,130,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4" style={{ color: "#63A282" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#63A282" }}>Skin Profile</p>
            </div>
            <div>
              <p className="font-serif text-xl" style={{ color: "#F0E8D8" }}>{skinType}</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(240,232,216,0.55)" }}>
                {SKIN_TYPE_DESC[skinType] ?? ""}
              </p>
            </div>
            {skinConcerns.length > 0 && (
              <div>
                <p className="text-[11px] mb-1" style={{ color: "rgba(240,232,216,0.35)" }}>Active concerns</p>
                <div className="flex flex-wrap gap-1">
                  {skinConcerns.map((c) => (
                    <span
                      key={c}
                      className="text-[10px] rounded-full px-2 py-0.5"
                      style={{ background: "rgba(99,162,130,0.15)", color: "#63A282" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Hairstyle */}
        {hairstyleNames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(99,143,179,0.07)", border: "1px solid rgba(99,143,179,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4" style={{ color: "#638FB3" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#638FB3" }}>Hairstyle</p>
            </div>
            <div>
              {latest?.hairstyle?.hairType && (
                <p className="text-xs mb-2" style={{ color: "rgba(240,232,216,0.55)" }}>
                  Hair type: <span style={{ color: "#F0E8D8" }}>{latest.hairstyle.hairType}</span>
                </p>
              )}
              <div className="space-y-1">
                {hairstyleNames.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#638FB3" }} />
                    <span className="text-sm" style={{ color: "#F0E8D8" }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Eye feature highlight */}
      {latest?.face_shape && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4" style={{ color: "rgba(240,232,216,0.4)" }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(240,232,216,0.35)" }}>
              Quick Style Rules
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {season && (
              <div>
                <p className="text-[10px] mb-1" style={{ color: "rgba(240,232,216,0.3)" }}>Wear more of</p>
                <p className="text-xs" style={{ color: "rgba(240,232,216,0.7)" }}>
                  {seasonTraits?.keywords.slice(0, 2).join(", ") ?? "earthy, warm tones"}
                </p>
              </div>
            )}
            {metals.length > 0 && (
              <div>
                <p className="text-[10px] mb-1" style={{ color: "rgba(240,232,216,0.3)" }}>Jewellery</p>
                <p className="text-xs" style={{ color: "rgba(240,232,216,0.7)" }}>{metals.join(", ")}</p>
              </div>
            )}
            {skinConcerns.length > 0 && (
              <div>
                <p className="text-[10px] mb-1" style={{ color: "rgba(240,232,216,0.3)" }}>Focus on</p>
                <p className="text-xs" style={{ color: "rgba(240,232,216,0.7)" }}>{skinConcerns[0]} care</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Link to latest report */}
      {latest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex justify-center"
        >
          <a
            href={`/report/${latest.id}`}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: "rgba(240,232,216,0.35)" }}
          >
            View full analysis →
          </a>
        </motion.div>
      )}
    </div>
  );
}
