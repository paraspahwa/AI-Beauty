"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import type { SkinAnalysisResult } from "@/types/report";

// ── Inline SVG icons ────────────────────────────────────────────────────────
function IconDrop({ filled = true }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 20" className="h-4 w-3" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2 C8 2 2 9 2 13 a6 6 0 0 0 12 0 C14 9 8 2 8 2z" />
    </svg>
  );
}
function IconPores() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <circle cx="8" cy="8" r="2" /><circle cx="16" cy="8" r="2" />
      <circle cx="12" cy="15" r="2" /><circle cx="6" cy="15" r="1.2" />
      <circle cx="18" cy="15" r="1.2" />
    </svg>
  );
}
function IconWave() {
  return (
    <svg viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M2 7c2-4 4-4 6 0s4 4 6 0 4-4 6 0" strokeLinecap="round" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
    </svg>
  );
}
function IconFlaky() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M12 2 L14 8 L20 6 L16 11 L22 13 L16 15 L20 20 L14 18 L12 24 L10 18 L4 20 L8 15 L2 13 L8 11 L4 6 L10 8 Z" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="8" x2="21" y2="8" />
      <path d="M3 8 C3 8 5 14 9 14 C13 14 15 8 15 8" /><path d="M9 8 C9 8 11 14 15 14 C19 14 21 8 21 8" />
    </svg>
  );
}
function IconLightweight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M12 3 C8 3 4 7 4 12 C4 17 8 21 12 21 C16 21 20 17 20 12 C20 7 16 3 12 3" strokeDasharray="3 2" />
      <path d="M12 7 L12 17 M9 10 L12 7 L15 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Oil-level indicator (filled/empty drops) ──────────────────────────────
function OilLevel({ level }: { level: number }) {
  // level 0-3 filled drops out of 3
  return (
    <div className="flex gap-0.5" style={{ color: "#9C7D5B" }}>
      {[0, 1, 2].map((i) => <IconDrop key={i} filled={i < level} />)}
    </div>
  );
}

// ── Skin type config ───────────────────────────────────────────────────────
const SKIN_TYPES = ["Oily", "Dry", "Combination", "Normal", "Sensitive"] as const;

const SKIN_TYPE_TRAITS: Record<string, { icon: React.ReactNode; label: string }[]> = {
  Oily:        [{ icon: <IconSparkle />, label: "Shiny" }, { icon: <IconPores />, label: "Enlarged Pores" }, { icon: <IconDrop filled />, label: "Breakouts" }],
  Dry:         [{ icon: <IconFlaky />,   label: "Flaky" }, { icon: <IconWave />,   label: "Tight" },          { icon: <IconPores />,       label: "Dull" }],
  Combination: [{ icon: <IconDrop filled />, label: "Oily T-Zone" }, { icon: <IconDrop filled={false} />, label: "Normal Cheeks" }, { icon: <IconScale />, label: "Balanced" }],
  Normal:      [{ icon: <IconSparkle />, label: "Balanced" }, { icon: <IconWave />, label: "Smooth" }, { icon: <IconLightweight />, label: "Healthy" }],
  Sensitive:   [{ icon: <IconWave />, label: "Redness" }, { icon: <IconSparkle />, label: "Irritation" }, { icon: <IconWave />, label: "Reactive" }],
};

const BEST_MATCH_BENEFITS: Record<string, { icon: React.ReactNode; label: string }[]> = {
  Oily:        [{ icon: <IconScale />, label: "Control Oil" }, { icon: <IconSparkle />, label: "Gentle Exfoliation" }, { icon: <IconLightweight />, label: "Light Moisturiser" }],
  Dry:         [{ icon: <IconDrop filled />, label: "Deep Hydration" }, { icon: <IconSparkle />, label: "Nourishing Oils" }, { icon: <IconLightweight />, label: "Rich Moisture" }],
  Combination: [{ icon: <IconScale />, label: "Balance Oil & Hydration" }, { icon: <IconSparkle />, label: "Gentle Exfoliation" }, { icon: <IconLightweight />, label: "Lightweight Moisture" }],
  Normal:      [{ icon: <IconSparkle />, label: "Maintain Glow" }, { icon: <IconScale />, label: "Stay Balanced" }, { icon: <IconLightweight />, label: "Light Hydration" }],
  Sensitive:   [{ icon: <IconWave />, label: "Soothe & Calm" }, { icon: <IconSparkle />, label: "Fragrance Free" }, { icon: <IconLightweight />, label: "Barrier Support" }],
};

// derive oil level from zone observation text
function oilLevelFromObs(obs: string): number {
  const l = obs.toLowerCase();
  if (l.includes("very oily") || l.includes("extremely")) return 3;
  if (l.includes("oily") || l.includes("shiny")) return 2;
  if (l.includes("slightly") || l.includes("normal") || l.includes("balanced")) return 1;
  return 0;
}

// Zone rows config
const ZONE_ROWS = [
  { key: "T-Zone",  label: "T-ZONE",  icon: <IconDrop filled /> },
  { key: "Cheeks",  label: "CHEEKS",  icon: <IconDrop filled={false} /> },
  { key: "Pores",   label: "PORES",   icon: <IconPores /> },
  { key: "Texture", label: "TEXTURE", icon: <IconWave /> },
];

// ── Main card ──────────────────────────────────────────────────────────────
export function SkinAnalysisCard({
  data,
  photoUrl,
}: {
  data: SkinAnalysisResult;
  photoUrl?: string;
}) {
  const skinType = data.type;
  const allTypes: string[] = ["Oily", "Dry", skinType, "Sensitive"];
  // ensure the user's actual type is in the comparison; deduplicate
  const compTypes = Array.from(new Set(allTypes)).slice(0, 4);

  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold text-center";
  const warmBrown = { color: "#9C7D5B" };

  // Build zone rows from data.zones
  const zoneMap = Object.fromEntries(data.zones.map((z) => [z.zone, z.observation]));
  const zoneRows = ZONE_ROWS.map((r) => {
    const obs = zoneMap[r.key] ?? zoneMap[Object.keys(zoneMap).find(k => k.toLowerCase().includes(r.key.toLowerCase())) ?? ""] ?? "";
    return { ...r, observation: obs || (r.key === "Pores" ? "Visible" : r.key === "Texture" ? "Slight Uneven" : "Normal"), oilLevel: oilLevelFromObs(obs) };
  });

  const benefits = BEST_MATCH_BENEFITS[skinType] ?? BEST_MATCH_BENEFITS["Combination"];
  const compTraits = SKIN_TYPE_TRAITS;

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>

      {/* ── Top: photo LEFT + zone analysis RIGHT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: "1px solid #E8DDD0" }}>

        {/* Photo with dashed zone overlay */}
        <div className="relative min-h-[320px] md:min-h-[460px]" style={{ background: "#EDE3D8" }}>
          {photoUrl ? (
            <>
              <Image src={photoUrl} alt="Skin analysis photo" fill unoptimized className="object-cover object-center" />
              {/* T-zone dashed overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet">
                {/* forehead */}
                <rect x="35" y="12" width="30" height="18" rx="8" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.85" />
                {/* nose bridge */}
                <rect x="43" y="28" width="14" height="30" rx="5" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.85" />
                {/* left cheek */}
                <ellipse cx="28" cy="68" rx="12" ry="10" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.85" />
                {/* right cheek */}
                <ellipse cx="72" cy="68" rx="12" ry="10" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.85" />
                {/* chin */}
                <ellipse cx="50" cy="98" rx="13" ry="8" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.85" />
              </svg>
            </>
          ) : (
            <div className="flex h-full items-center justify-center" style={{ color: "#9C7D5B" }}>
              No photo
            </div>
          )}
        </div>

        {/* Zone rows */}
        <div className="flex flex-col justify-center gap-0 divide-y" style={{ borderLeft: "1px solid #E8DDD0" }}>
          {/* Title */}
          <div className="px-8 py-5">
            <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-right" style={{ color: "#3D2B1F" }}>
              Skin Analysis
            </h2>
          </div>

          {zoneRows.map((z) => (
            <div key={z.key} className="flex items-center gap-5 px-6 py-4" style={{ borderColor: "#E8DDD0" }}>
              {/* Zone circle: real photo or gradient fallback */}
              <div
                className="shrink-0 h-16 w-16 rounded-full shadow-md overflow-hidden relative"
                style={{ border: "2px solid #fff" }}
              >
                {photoUrl ? (
                  <Image src={photoUrl} alt={z.label} fill unoptimized className="object-cover object-center" />
                ) : (
                  <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#DFD0BE,#C8B09A)" }} />
                )}
              </div>
              {/* Label + observation + oil level */}
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold mb-0.5" style={{ color: "#3D2B1F" }}>
                  {z.label}
                </p>
                <p className="text-sm" style={{ color: "#6B5344" }}>{z.observation}</p>
                {(z.key === "T-Zone" || z.key === "Cheeks") ? (
                  <OilLevel level={z.oilLevel} />
                ) : (
                  <div className="mt-1" style={{ color: "#9C7D5B" }}>
                    {z.icon}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Skin Type Comparison ── */}
      <div className="px-6 py-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3 mb-5">
          <span style={{ color: "#C8A96E", fontSize: 14 }}>✦</span>
          <p className={sectionTitle} style={warmBrown}>Skin Type Comparison</p>
          <span style={{ color: "#C8A96E", fontSize: 14 }}>✦</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {compTypes.map((type) => {
            const isMatch = type === skinType;
            const traits = compTraits[type] ?? compTraits["Combination"];
            return (
              <div
                key={type}
                className="flex flex-col rounded-2xl overflow-hidden"
                style={{
                  border: isMatch ? "2px solid #9C7D5B" : "1px solid #E8DDD0",
                  background: isMatch ? "#F5EFE7" : "#FDFAF6",
                }}
              >
                {/* Type header + badge */}
                <div className="flex items-center justify-between px-3 py-2" style={{ background: isMatch ? "#EDE3D8" : "#F5EFE7", borderBottom: "1px solid #E8DDD0" }}>
                  <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#3D2B1F" }}>{type}</p>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: isMatch ? "#7BA05B" : "#C06B3E" }}
                  >
                    {isMatch
                      ? <Check className="h-3 w-3 text-white" />
                      : <X className="h-3 w-3 text-white" />}
                  </span>
                </div>

                {/* Photo: real photo with optional overlay */}
                <div className="w-full relative" style={{ aspectRatio: "3/4" }}>
                  {photoUrl ? (
                    <>
                      <Image src={photoUrl} alt={type} fill unoptimized className="object-cover object-center" />
                      {/* desaturate non-match cards slightly */}
                      {!isMatch && (
                        <div className="absolute inset-0" style={{ background: "rgba(232,224,216,0.45)" }} />
                      )}
                    </>
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: isMatch ? "linear-gradient(160deg,#DFD0BE,#C8B09A)" : "linear-gradient(160deg,#E8E0D8,#D0C4B4)" }}
                    />
                  )}
                  {isMatch && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet">
                      <rect x="35" y="12" width="30" height="18" rx="8" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
                      <rect x="43" y="28" width="14" height="30" rx="5" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
                      <ellipse cx="28" cy="68" rx="12" ry="10" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
                      <ellipse cx="72" cy="68" rx="12" ry="10" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
                    </svg>
                  )}
                </div>

                {/* Traits row */}
                <div className="flex justify-around px-2 py-3" style={{ borderTop: "1px solid #E8DDD0" }}>
                  {traits.map((t, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 text-center">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "#EDE3D8", color: "#9C7D5B" }}
                      >
                        {t.icon}
                      </span>
                      <span className="text-[9px] leading-tight max-w-[40px]" style={{ color: "#6B5344" }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Best Match banner ── */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span style={{ color: "#C8A96E" }}>✦</span>
          <p className={sectionTitle} style={warmBrown}>Best Match</p>
          <span style={{ color: "#C8A96E" }}>✦</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Pill */}
          <div
            className="flex items-center gap-3 px-6 py-4 rounded-2xl min-w-[220px] justify-center"
            style={{ background: "#8B7D6B", color: "#fff" }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
              <IconDrop filled />
            </span>
            <p className="text-base font-black uppercase tracking-widest">{skinType} Skin</p>
          </div>

          {/* Benefits */}
          <div className="flex gap-6 justify-center flex-wrap">
            {benefits.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "#EDE3D8", color: "#9C7D5B", border: "1px solid #E8DDD0" }}
                >
                  {b.icon}
                </span>
                <span className="text-xs leading-tight max-w-[64px]" style={{ color: "#6B5344" }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Routine */}
        {data.routine.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>
              Recommended Routine
            </p>
            <ol className="space-y-2.5">
              {data.routine.map((r, i) => (
                <li key={r.step} className="flex items-start gap-3 text-sm">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "#EDE3D8", color: "#9C7D5B" }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium" style={{ color: "#3D2B1F" }}>{r.step}</span>
                    <span style={{ color: "#9C7D5B" }}> — {r.product}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

