"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import type { SkinAnalysisResult } from "@/types/report";

const ZONE_ANIMATION_CSS = `
@keyframes skin-draw-zone {
  from { stroke-dashoffset: var(--perimeter, 200); opacity: 0; }
  8%   { opacity: 1; }
  to   { stroke-dashoffset: 0; opacity: 1; }
}
.skin-zone {
  stroke-dashoffset: var(--perimeter, 200);
  animation: skin-draw-zone 0.9s cubic-bezier(0.4,0,0.2,1) forwards;
}
`;

const ZC = {
  forehead:   { stroke: "#F59E0B", fill: "rgba(245,158,11,0.10)",  delay: "0s"    },
  noseStrip:  { stroke: "#F59E0B", fill: "rgba(245,158,11,0.07)",  delay: "0.12s" },
  leftCheek:  { stroke: "#F472B6", fill: "rgba(244,114,182,0.10)", delay: "0.28s" },
  rightCheek: { stroke: "#F472B6", fill: "rgba(244,114,182,0.10)", delay: "0.44s" },
  chin:       { stroke: "#FB923C", fill: "rgba(251,146,60,0.10)",  delay: "0.60s" },
} as const;

const GEO = {
  forehead:   { x: 28,  y: 14, w: 44, h: 20, rx: 10, perim: 128 },
  noseStrip:  { x: 42,  y: 32, w: 16, h: 30, rx:  6, perim:  92 },
  leftCheek:  { cx: 27, cy: 62, rx: 13, ry: 11, perim: 76 },
  rightCheek: { cx: 73, cy: 62, rx: 13, ry: 11, perim: 76 },
  chin:       { cx: 50, cy: 84, rx: 14, ry:  9, perim: 73 },
} as const;

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
      <circle cx="12" cy="15" r="2" /><circle cx="6" cy="15" r="1.2" /><circle cx="18" cy="15" r="1.2" />
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
      <path d="M3 8 C3 5 9 14 9 14 C13 14 15 8 15 8" /><path d="M9 8 C9 8 11 14 15 14 C19 14 21 8 21 8" />
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

function OilLevel({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" style={{ color: "#9C7D5B" }}>
      {[0, 1, 2].map((i) => <IconDrop key={i} filled={i < level} />)}
    </div>
  );
}

const SKIN_TYPE_TRAITS: Record<string, { icon: React.ReactNode; label: string }[]> = {
  Oily:        [{ icon: <IconSparkle />, label: "Shiny" }, { icon: <IconPores />, label: "Enlarged Pores" }, { icon: <IconDrop filled />, label: "Breakouts" }],
  Dry:         [{ icon: <IconFlaky />,   label: "Flaky" }, { icon: <IconWave />,   label: "Tight" },         { icon: <IconPores />,       label: "Dull" }],
  Combination: [{ icon: <IconDrop filled />, label: "Oily T-Zone" }, { icon: <IconDrop filled={false} />, label: "Normal Cheeks" }, { icon: <IconScale />, label: "Balanced" }],
  Normal:      [{ icon: <IconSparkle />, label: "Balanced" }, { icon: <IconWave />, label: "Smooth" }, { icon: <IconLightweight />, label: "Healthy" }],
  Sensitive:   [{ icon: <IconWave />, label: "Redness" }, { icon: <IconSparkle />, label: "Irritation" }, { icon: <IconWave />, label: "Reactive" }],
};

const BEST_MATCH_BENEFITS: Record<string, { icon: React.ReactNode; label: string }[]> = {
  Oily:        [{ icon: <IconScale />,       label: "Control Oil" },       { icon: <IconSparkle />,     label: "Gentle Exfoliation" }, { icon: <IconLightweight />, label: "Light Moisturiser" }],
  Dry:         [{ icon: <IconDrop filled />, label: "Deep Hydration" },    { icon: <IconSparkle />,     label: "Nourishing Oils" },    { icon: <IconLightweight />, label: "Rich Moisture" }],
  Combination: [{ icon: <IconScale />,       label: "Balance Hydration" }, { icon: <IconSparkle />,     label: "Gentle Exfoliation" }, { icon: <IconLightweight />, label: "Lightweight Moisture" }],
  Normal:      [{ icon: <IconSparkle />,     label: "Maintain Glow" },     { icon: <IconScale />,       label: "Stay Balanced" },      { icon: <IconLightweight />, label: "Light Hydration" }],
  Sensitive:   [{ icon: <IconWave />,        label: "Soothe & Calm" },     { icon: <IconSparkle />,     label: "Fragrance Free" },     { icon: <IconLightweight />, label: "Barrier Support" }],
};

const ZONE_ROWS = [
  { key: "T-Zone",  label: "T-ZONE",  icon: <IconDrop filled />,        thumbPosition: "50% 18%", zoneColor: "#F59E0B" },
  { key: "Cheeks",  label: "CHEEKS",  icon: <IconDrop filled={false} />, thumbPosition: "50% 50%", zoneColor: "#F472B6" },
  { key: "Pores",   label: "PORES",   icon: <IconPores />,               thumbPosition: "50% 42%", zoneColor: "#9C7D5B" },
  { key: "Texture", label: "TEXTURE", icon: <IconWave />,                thumbPosition: "50% 35%", zoneColor: "#FB923C" },
] as const;

function oilLevelFromObs(obs: string): number {
  const l = obs.toLowerCase();
  if (l.includes("very oily") || l.includes("extremely")) return 3;
  if (l.includes("oily") || l.includes("shiny")) return 2;
  if (l.includes("slightly") || l.includes("normal") || l.includes("balanced")) return 1;
  return 0;
}

function ZoneOverlay({ small = false }: { small?: boolean }) {
  const sw = small ? "1" : "0.9";
  const da = small ? "3 2" : "2 1.5";
  const ts = small ? 4 : 3.5;

  function rp(key: keyof typeof ZC, perim: number) {
    return {
      className: "skin-zone",
      fill: ZC[key].fill,
      stroke: ZC[key].stroke,
      strokeWidth: sw,
      strokeDasharray: da,
      style: { "--perimeter": perim, animationDelay: ZC[key].delay } as React.CSSProperties,
    };
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet">
      <rect {...rp("forehead", GEO.forehead.perim)} x={GEO.forehead.x} y={GEO.forehead.y} width={GEO.forehead.w} height={GEO.forehead.h} rx={GEO.forehead.rx} />
      <text x="50" y="26" textAnchor="middle" fontSize={ts} fill={ZC.forehead.stroke} fontWeight="700" opacity="0.95">T</text>

      <rect {...rp("noseStrip", GEO.noseStrip.perim)} x={GEO.noseStrip.x} y={GEO.noseStrip.y} width={GEO.noseStrip.w} height={GEO.noseStrip.h} rx={GEO.noseStrip.rx} />

      <ellipse {...rp("leftCheek", GEO.leftCheek.perim)} cx={GEO.leftCheek.cx} cy={GEO.leftCheek.cy} rx={GEO.leftCheek.rx} ry={GEO.leftCheek.ry} />
      <text x={GEO.leftCheek.cx} y={GEO.leftCheek.cy + 1.5} textAnchor="middle" fontSize={ts} fill={ZC.leftCheek.stroke} fontWeight="700" opacity="0.95">L</text>

      <ellipse {...rp("rightCheek", GEO.rightCheek.perim)} cx={GEO.rightCheek.cx} cy={GEO.rightCheek.cy} rx={GEO.rightCheek.rx} ry={GEO.rightCheek.ry} />
      <text x={GEO.rightCheek.cx} y={GEO.rightCheek.cy + 1.5} textAnchor="middle" fontSize={ts} fill={ZC.rightCheek.stroke} fontWeight="700" opacity="0.95">R</text>

      {!small && (
        <>
          <ellipse {...rp("chin", GEO.chin.perim)} cx={GEO.chin.cx} cy={GEO.chin.cy} rx={GEO.chin.rx} ry={GEO.chin.ry} />
          <text x="50" y={GEO.chin.cy + 1.5} textAnchor="middle" fontSize={ts} fill={ZC.chin.stroke} fontWeight="700" opacity="0.95">C</text>
        </>
      )}
    </svg>
  );
}

function ZoneThumb({ photoUrl, thumbPosition, zoneColor, label }: { photoUrl?: string; thumbPosition: string; zoneColor: string; label: string }) {
  return (
    <div className="shrink-0 h-16 w-16 rounded-full shadow-md overflow-hidden relative" style={{ border: `2.5px solid ${zoneColor}` }}>
      {photoUrl ? (
        <Image src={photoUrl} alt={label} fill unoptimized className="object-cover" style={{ objectPosition: thumbPosition }} />
      ) : (
        <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#DFD0BE,#C8B09A)" }} />
      )}
    </div>
  );
}

export function SkinAnalysisCard({ data, photoUrl }: { data: SkinAnalysisResult; photoUrl?: string }) {
  const skinType  = data.type;
  const compTypes = Array.from(new Set(["Oily", "Dry", skinType, "Sensitive"])).slice(0, 4);
  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold text-center";
  const warmBrown    = { color: "#9C7D5B" };

  const zoneMap  = Object.fromEntries(data.zones.map((z) => [z.zone, z.observation]));
  const zoneRows = ZONE_ROWS.map((r) => {
    const obs = zoneMap[r.key] ?? zoneMap[Object.keys(zoneMap).find((k) => k.toLowerCase().includes(r.key.toLowerCase())) ?? ""] ?? "";
    return { ...r, observation: obs || (r.key === "Pores" ? "Visible" : r.key === "Texture" ? "Slight Uneven" : "Normal"), oilLevel: oilLevelFromObs(obs) };
  });

  const benefits = BEST_MATCH_BENEFITS[skinType] ?? BEST_MATCH_BENEFITS["Combination"];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ZONE_ANIMATION_CSS }} />
      <div className="rounded-3xl overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: "1px solid #E8DDD0" }}>
          <div className="relative min-h-[320px] md:min-h-[460px]" style={{ background: "#EDE3D8" }}>
            {photoUrl ? (
              <>
                <Image src={photoUrl} alt="Skin analysis photo" fill unoptimized className="object-cover object-top" />
                <ZoneOverlay small={false} />
                <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                  {[{ label: "T-Zone", color: ZC.forehead.stroke }, { label: "Cheeks", color: ZC.leftCheek.stroke }, { label: "Chin", color: ZC.chin.stroke }].map((l) => (
                    <span key={l.label} className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)", color: l.color, border: `1px solid ${l.color}` }}>
                      {l.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center" style={{ color: "#9C7D5B" }}>No photo</div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-0 divide-y" style={{ borderLeft: "1px solid #E8DDD0" }}>
            <div className="px-8 py-5">
              <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-right" style={{ color: "#3D2B1F" }}>Skin Analysis</h2>
            </div>
            {zoneRows.map((z) => (
              <div key={z.key} className="flex items-center gap-5 px-6 py-4" style={{ borderColor: "#E8DDD0" }}>
                <ZoneThumb photoUrl={photoUrl} thumbPosition={z.thumbPosition} zoneColor={z.zoneColor} label={z.label} />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] font-bold mb-0.5" style={{ color: z.zoneColor }}>{z.label}</p>
                  <p className="text-sm" style={{ color: "#6B5344" }}>{z.observation}</p>
                  {(z.key === "T-Zone" || z.key === "Cheeks") ? <OilLevel level={z.oilLevel} /> : <div className="mt-1" style={{ color: "#9C7D5B" }}>{z.icon}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
          <div className="flex items-center justify-center gap-3 mb-5">
            <span style={{ color: "#C8A96E", fontSize: 14 }}>&#10022;</span>
            <p className={sectionTitle} style={warmBrown}>Skin Type Comparison</p>
            <span style={{ color: "#C8A96E", fontSize: 14 }}>&#10022;</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {compTypes.map((type) => {
              const isMatch = type === skinType;
              const traits  = SKIN_TYPE_TRAITS[type] ?? SKIN_TYPE_TRAITS["Combination"];
              return (
                <div key={type} className="flex flex-col rounded-2xl overflow-hidden" style={{ border: isMatch ? "2px solid #9C7D5B" : "1px solid #E8DDD0", background: isMatch ? "#F5EFE7" : "#FDFAF6" }}>
                  <div className="flex items-center justify-between px-3 py-2" style={{ background: isMatch ? "#EDE3D8" : "#F5EFE7", borderBottom: "1px solid #E8DDD0" }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#3D2B1F" }}>{type}</p>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: isMatch ? "#7BA05B" : "#C06B3E" }}>
                      {isMatch ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-white" />}
                    </span>
                  </div>
                  <div className="w-full relative" style={{ aspectRatio: "3/4" }}>
                    {photoUrl ? (
                      <>
                        <Image src={photoUrl} alt={type} fill unoptimized className="object-cover object-top" />
                        {!isMatch && <div className="absolute inset-0" style={{ background: "rgba(232,224,216,0.45)" }} />}
                      </>
                    ) : (
                      <div className="absolute inset-0" style={{ background: isMatch ? "linear-gradient(160deg,#DFD0BE,#C8B09A)" : "linear-gradient(160deg,#E8E0D8,#D0C4B4)" }} />
                    )}
                    {isMatch && <ZoneOverlay small={true} />}
                  </div>
                  <div className="flex justify-around px-2 py-3" style={{ borderTop: "1px solid #E8DDD0" }}>
                    {traits.map((t, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 text-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>{t.icon}</span>
                        <span className="text-[9px] leading-tight max-w-[40px]" style={{ color: "#6B5344" }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span style={{ color: "#C8A96E" }}>&#10022;</span>
            <p className={sectionTitle} style={warmBrown}>Best Match</p>
            <span style={{ color: "#C8A96E" }}>&#10022;</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl min-w-[220px] justify-center" style={{ background: "#8B7D6B", color: "#fff" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}><IconDrop filled /></span>
              <p className="text-base font-black uppercase tracking-widest">{skinType} Skin</p>
            </div>
            <div className="flex gap-6 justify-center flex-wrap">
              {benefits.map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B", border: "1px solid #E8DDD0" }}>{b.icon}</span>
                  <span className="text-xs leading-tight max-w-[64px]" style={{ color: "#6B5344" }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          {data.routine.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Recommended Routine</p>
              <ol className="space-y-2.5">
                {data.routine.map((r, i) => (
                  <li key={r.step} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>{i + 1}</span>
                    <div>
                      <span className="font-medium" style={{ color: "#3D2B1F" }}>{r.step}</span>
                      <span style={{ color: "#9C7D5B" }}> - {r.product}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
