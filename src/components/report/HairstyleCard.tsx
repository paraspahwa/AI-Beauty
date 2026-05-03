"use client";

import Image from "next/image";
import { Check, Minus } from "lucide-react";
import type { HairstyleResult } from "@/types/report";

// ── Animation CSS ────────────────────────────────────────────────────────────
const HAIR_CSS = `
@keyframes hair-draw {
  from { stroke-dashoffset: 1; opacity: 0; }
  8%   { opacity: 1; }
  to   { stroke-dashoffset: 0; opacity: 1; }
}
.hair-line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: hair-draw 0.8s cubic-bezier(0.4,0,0.2,1) forwards;
}

/* Length diagram: recommended line draws in left-to-right */
@keyframes length-line-draw {
  from { stroke-dashoffset: 120; opacity: 0.3; }
  to   { stroke-dashoffset: 0;   opacity: 1; }
}
.length-rec-line {
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  animation: length-line-draw 0.7s 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
}

/* Style card hover: expand description overlay */
.style-card { position: relative; }
.style-card .desc-overlay {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: none;
}
.style-card:hover .desc-overlay {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
`;

// ── Inline icons ─────────────────────────────────────────────────────────────
function IconWave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" strokeLinecap="round" />
    </svg>
  );
}
function IconScissors() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
    </svg>
  );
}

// ── Per-style hairstyle SVG overlay ─────────────────────────────────────────
// viewBox 0 0 100 140 — face occupies y=10-75, hair flows from the head
// Each style draws distinctive hair paths so the cards look unique.
function HairOverlay({ style, animate = false, delay = 0 }: { style: string; animate?: boolean; delay?: number }) {
  const s   = style.toLowerCase();
  const col = "rgba(255,255,255,0.82)";
  const sw  = "1.4";

  function ac(d = 0): React.SVGProps<SVGPathElement> {
    if (!animate) return {};
    return {
      className: "hair-line",
      pathLength: 1,
      style: { animationDelay: `${delay + d}s` } as React.CSSProperties,
    };
  }

  // Head oval centred at cx=50 cy=38, rx=18 ry=22
  // Hair starts from the crown (y~16) and ears (x~32 / x~68)

  let paths: React.ReactNode;

  if (s.includes("long layer") || s.includes("long layer")) {
    // Long layers: smooth flowing lines down past shoulders, slight wave at ends
    paths = (
      <>
        <path d="M32 30 C18 50 14 80 16 120" stroke={col} strokeWidth={sw} fill="none" {...ac(0)} />
        <path d="M34 28 C20 50 18 85 20 125" stroke={col} strokeWidth={sw} fill="none" {...ac(0.07)} />
        <path d="M68 30 C82 50 86 80 84 120" stroke={col} strokeWidth={sw} fill="none" {...ac(0.04)} />
        <path d="M66 28 C80 50 82 85 80 125" stroke={col} strokeWidth={sw} fill="none" {...ac(0.11)} />
        {/* top volume */}
        <path d="M36 16 C38 10 62 10 64 16" stroke={col} strokeWidth={sw} fill="none" {...ac(0.14)} />
      </>
    );
  } else if (s.includes("bob") || s.includes("lob")) {
    // Bob/Lob: hair ends at jaw / shoulder level
    paths = (
      <>
        <path d="M32 30 C18 48 18 65 22 76" stroke={col} strokeWidth={sw} fill="none" {...ac(0)} />
        <path d="M68 30 C82 48 82 65 78 76" stroke={col} strokeWidth={sw} fill="none" {...ac(0.05)} />
        {/* blunt bottom line */}
        <path d="M22 76 C38 80 62 80 78 76" stroke={col} strokeWidth={sw} fill="none" {...ac(0.10)} />
        {/* top */}
        <path d="M36 16 C40 10 60 10 64 16" stroke={col} strokeWidth={sw} fill="none" {...ac(0.15)} />
      </>
    );
  } else if (s.includes("bang") || s.includes("fringe")) {
    // Side-swept bangs: diagonal fringe across forehead + flowing sides
    paths = (
      <>
        {/* side-swept bang */}
        <path d="M36 16 C44 18 54 22 58 26" stroke={col} strokeWidth="2" fill="none" {...ac(0)} />
        <path d="M36 16 C42 20 50 24 54 28" stroke={col} strokeWidth={sw} fill="none" {...ac(0.05)} />
        {/* flowing sides */}
        <path d="M32 30 C18 52 16 90 18 115" stroke={col} strokeWidth={sw} fill="none" {...ac(0.10)} />
        <path d="M68 30 C82 52 84 90 82 115" stroke={col} strokeWidth={sw} fill="none" {...ac(0.12)} />
      </>
    );
  } else if (s.includes("updo") || s.includes("bun") || s.includes("ponytail") || s.includes("pony")) {
    // Updo/Ponytail: hair gathered upward, bun at top or tail at back
    const isTail = s.includes("pony");
    paths = (
      <>
        {/* sides swept up */}
        <path d="M32 34 C28 28 32 20 40 17" stroke={col} strokeWidth={sw} fill="none" {...ac(0)} />
        <path d="M68 34 C72 28 68 20 60 17" stroke={col} strokeWidth={sw} fill="none" {...ac(0.05)} />
        {isTail ? (
          // ponytail flowing down from crown
          <path d="M50 14 C54 8 58 20 52 50 C48 70 46 90 48 110" stroke={col} strokeWidth="2" fill="none" {...ac(0.10)} />
        ) : (
          // bun circle at top
          <>
            <circle cx="50" cy="12" r="7" stroke={col} strokeWidth={sw} fill="none" {...(ac(0.10) as React.SVGProps<SVGCircleElement>)} />
            <path d="M44 16 C42 18 42 22 44 24" stroke={col} strokeWidth="1" fill="none" {...ac(0.15)} />
          </>
        )}
      </>
    );
  } else if (s.includes("wavy") || s.includes("wave")) {
    // Wavy: sinusoidal paths flowing down from head
    paths = (
      <>
        <path d="M32 30 C16 44 20 56 14 68 C10 78 16 92 12 110" stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" {...ac(0)} />
        <path d="M68 30 C84 44 80 56 86 68 C90 78 84 92 88 110" stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" {...ac(0.06)} />
        <path d="M36 16 C40 10 60 10 64 16" stroke={col} strokeWidth={sw} fill="none" {...ac(0.12)} />
      </>
    );
  } else if (s.includes("curl") || s.includes("coil") || s.includes("afro")) {
    // Curly/Afro: voluminous cloud-like halo with spiral hints
    paths = (
      <>
        {/* volume halo */}
        <path d="M26 22 C14 14 12 30 18 36" stroke={col} strokeWidth={sw} fill="none" {...ac(0)} />
        <path d="M74 22 C86 14 88 30 82 36" stroke={col} strokeWidth={sw} fill="none" {...ac(0.06)} />
        <path d="M36 12 C38 4 62 4 64 12" stroke={col} strokeWidth="2" fill="none" {...ac(0.10)} />
        {/* spiral hints */}
        <path d="M22 40 C18 46 20 54 24 58" stroke={col} strokeWidth="1.1" fill="none" {...ac(0.14)} />
        <path d="M78 40 C82 46 80 54 76 58" stroke={col} strokeWidth="1.1" fill="none" {...ac(0.16)} />
      </>
    );
  } else if (s.includes("pixie") || s.includes("short")) {
    // Pixie/Short: barely covers the ears, cropped crown
    paths = (
      <>
        <path d="M33 26 C24 30 22 40 24 50" stroke={col} strokeWidth={sw} fill="none" {...ac(0)} />
        <path d="M67 26 C76 30 78 40 76 50" stroke={col} strokeWidth={sw} fill="none" {...ac(0.05)} />
        {/* short textured top */}
        <path d="M36 16 C40 12 50 10 60 12 L64 16" stroke={col} strokeWidth="2" fill="none" {...ac(0.10)} />
        <path d="M40 13 C42 9 48 8 54 10" stroke={col} strokeWidth="1.1" fill="none" {...ac(0.14)} />
      </>
    );
  } else if (s.includes("straight") || s.includes("sleek")) {
    // Straight/Sleek: perfectly straight parallel lines
    paths = (
      <>
        <path d="M32 28 L22 110" stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" {...ac(0)} />
        <path d="M35 26 L26 112" stroke={col} strokeWidth="1.1" fill="none" strokeLinecap="round" {...ac(0.06)} />
        <path d="M68 28 L78 110" stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" {...ac(0.04)} />
        <path d="M65 26 L74 112" stroke={col} strokeWidth="1.1" fill="none" strokeLinecap="round" {...ac(0.09)} />
        <path d="M36 16 C40 10 60 10 64 16" stroke={col} strokeWidth={sw} fill="none" {...ac(0.13)} />
      </>
    );
  } else if (s.includes("textured") || s.includes("shag")) {
    // Textured/Shag: jagged layered lines
    paths = (
      <>
        <path d="M32 30 C20 44 22 60 18 80 C16 96 20 110 18 120" stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" {...ac(0)} />
        <path d="M68 30 C80 44 78 60 82 80 C84 96 80 110 82 120" stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" {...ac(0.06)} />
        {/* layered fringe */}
        <path d="M36 16 C40 12 46 14 50 16 C54 14 60 12 64 16" stroke={col} strokeWidth="2" fill="none" {...ac(0.12)} />
        <path d="M38 19 C42 16 48 18 50 20 C52 18 58 16 62 19" stroke={col} strokeWidth="1.1" fill="none" {...ac(0.16)} />
      </>
    );
  } else {
    // Default: medium-length loose waves
    paths = (
      <>
        <path d="M32 30 C18 50 16 80 18 110" stroke={col} strokeWidth={sw} fill="none" {...ac(0)} />
        <path d="M68 30 C82 50 84 80 82 110" stroke={col} strokeWidth={sw} fill="none" {...ac(0.06)} />
        <path d="M36 16 C40 10 60 10 64 16" stroke={col} strokeWidth={sw} fill="none" {...ac(0.12)} />
      </>
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 140"
      preserveAspectRatio="xMidYMid meet"
    >
      {paths}
    </svg>
  );
}

// ── Hair texture inference ───────────────────────────────────────────────────
function textureFromStyle(name: string): { label: string; color: string; bg: string } {
  const s = name.toLowerCase();
  if (s.includes("straight") || s.includes("sleek") || s.includes("pixie") ||
      s.includes("short") || s.includes("bob") || s.includes("lob"))
    return { label: "Straight", color: "#1D4ED8", bg: "#DBEAFE" };
  if (s.includes("curl") || s.includes("coil") || s.includes("afro") ||
      s.includes("wave") || s.includes("wavy"))
    return { label: "Curly/Wavy", color: "#7C3AED", bg: "#F3E8FF" };
  return { label: "Wavy", color: "#B45309", bg: "#FEF3C7" };
}

// ── Maintenance level inference ───────────────────────────────────────────────
function maintenanceFromStyle(name: string): { level: 1 | 2 | 3; label: string } {
  const s = name.toLowerCase();
  if (s.includes("pixie") || s.includes("short") || s.includes("bob") || s.includes("sleek"))
    return { level: 1, label: "Low" };
  if (s.includes("curl") || s.includes("afro") || s.includes("updo") ||
      s.includes("bun") || s.includes("textured") || s.includes("shag"))
    return { level: 3, label: "High" };
  return { level: 2, label: "Medium" };
}

const MAINTENANCE_COLORS: Record<1 | 2 | 3, { filled: string; empty: string }> = {
  1: { filled: "#7BA05B", empty: "#D1FAE5" },
  2: { filled: "#F59E0B", empty: "#FEF3C7" },
  3: { filled: "#C06B3E", empty: "#FDE8DC" },
};

// ── Length diagram ────────────────────────────────────────────────────────────
// Length levels mapped to SVG y-coordinates inside viewBox 0 0 80 200
// Silhouette: head centre y=36, chin y=62, shoulders y=76, body extends to y=190
const LENGTH_LEVELS = [
  { label: "Short",          y: 72  },   // chin/jaw
  { label: "Collarbone",     y: 95  },   // collarbone
  { label: "Below Shoulder", y: 120 },   // below shoulder
  { label: "Mid Back",       y: 155 },   // mid-back
];

function LengthDiagram({ recommended }: { recommended: string }) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 210" fill="none" className="h-56 w-auto">
        {/* ── silhouette ── */}
        {/* head */}
        <ellipse cx="55" cy="36" rx="20" ry="26" stroke="#C8B89A" strokeWidth="1.3" />
        {/* neck */}
        <line x1="47" y1="61" x2="45" y2="76" stroke="#C8B89A" strokeWidth="1.3" />
        <line x1="63" y1="61" x2="65" y2="76" stroke="#C8B89A" strokeWidth="1.3" />
        {/* shoulders */}
        <path d="M45 76 C34 80 24 90 20 104" stroke="#C8B89A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M65 76 C76 80 86 90 90 104" stroke="#C8B89A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        {/* hair flowing dashes */}
        <path d="M36 44 C26 64 22 104 24 168" stroke="#C8B89A" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" fill="none" />
        <path d="M74 44 C84 64 88 104 86 168" stroke="#C8B89A" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" fill="none" />

        {/* ── length indicator lines ── */}
        {LENGTH_LEVELS.map(({ label, y }) => {
          const isRec = recommended.toLowerCase().includes(label.toLowerCase().split(" ")[0]);
          return (
            <g key={label}>
              {isRec ? (
                /* animated golden recommended line */
                <>
                  <line
                    x1="4" y1={y} x2="106" y2={y}
                    stroke="#9C7D5B" strokeWidth="1.4"
                    className="length-rec-line"
                  />
                  {/* ♥ marker */}
                  <text x="110" y={y + 1.5} fontSize="7" fill="#9C7D5B" fontWeight="700">&#9825;</text>
                  <text x="120" y={y + 1.5} fontSize="6.5" fill="#3D2B1F" fontWeight="700">{label}</text>
                </>
              ) : (
                /* static faint line */
                <>
                  <line x1="4" y1={y} x2="106" y2={y} stroke="#C8B89A" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.5" />
                  <text x="110" y={y + 1.5} fontSize="6" fill="#A89070">{label}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const HAIR_BENEFITS = ["Adds Volume", "Enhances Texture", "Frames Face Beautifully"];

// ── Main card ─────────────────────────────────────────────────────────────────
export function HairstyleCard({
  data,
  photoUrl,
  previewUrls,
  faceShape,
  faceTraits,
  bestFeatures,
  stylingTips,
  hairType,
}: {
  data: HairstyleResult;
  photoUrl?: string;
  previewUrls?: string[];
  faceShape?: string;
  faceTraits?: string[];
  bestFeatures?: string[];
  stylingTips?: string[];
  hairType?: string;
}) {
  const flatteningStyles  = data.styles.slice(0, 5);
  const considerStyles    = data.avoid.slice(0, 3);
  const bestLength        = data.lengths[1]?.name ?? "Collarbone to Below Shoulder";
  const resolvedHairType  = hairType ?? "Wavy / Curly";
  const resolvedFaceShape = faceShape ?? "Oval";
  const resolvedTraits    = (faceTraits ?? ["Full cheeks", "Soft jawline", "Balanced proportions"]).slice(0, 3);
  const resolvedFeatures  = (bestFeatures ?? ["Almond eyes", "Rounded cheeks", "Full lips"]).slice(0, 3);
  const resolvedTips      = (stylingTips ?? data.avoid.slice(0, 3)).slice(0, 3);

  const hairGoals = [
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5"><ellipse cx="12" cy="14" rx="8" ry="9" /><path d="M8 9 Q12 5 16 9" /></svg>, label: "Frame the face" },
    { icon: <IconWave />, label: "Add movement & volume" },
    { icon: <IconSparkle />, label: "Enhance natural texture" },
  ];

  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold text-center mb-4";
  const sT = { color: "#9C7D5B" };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HAIR_CSS }} />
      <div className="rounded-3xl overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>

        {/* ── Header ── */}
        <div className="text-center pt-8 pb-4 px-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
          <div className="flex items-center justify-center gap-3 mb-1">
            <span style={{ color: "#C8A96E", fontSize: 18 }}>&#10022;</span>
            <h2 className="text-3xl font-serif" style={{ color: "#3D2B1F" }}>Hairstyle Analysis</h2>
            <span style={{ color: "#C8A96E", fontSize: 18 }}>&#10022;</span>
          </div>
          <p className="text-sm" style={{ color: "#9C7D5B" }}>Find Styles That Flatter You</p>
        </div>

        {/* ── Hero 3-col ── */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_220px]" style={{ borderBottom: "1px solid #E8DDD0" }}>

          {/* Left */}
          <div className="p-5 space-y-4" style={{ borderRight: "1px solid #E8DDD0" }}>
            {/* Face shape */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#9C7D5B" }}>Face Shape</p>
              <p className="font-serif text-lg mb-2" style={{ color: "#3D2B1F" }}>{resolvedFaceShape}</p>
              <svg viewBox="0 0 40 48" fill="none" stroke="#9C7D5B" strokeWidth="1.4" className="h-12 w-10 mx-auto mb-3">
                <circle cx="20" cy="24" r="18" fill="#F59E0B" opacity="0.09" />
                <ellipse cx="20" cy="25" rx="14" ry="18" />
                <line x1="20" y1="8" x2="20" y2="42" strokeDasharray="2 2" opacity="0.35" />
              </svg>
              <ul className="space-y-1.5">
                {resolvedTraits.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#7BA05B" }} />{t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Hair Goals */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Hair Goals</p>
              <ul className="space-y-3">
                {hairGoals.map((g) => (
                  <li key={g.label} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>{g.icon}</span>
                    {g.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Centre: Before / After split hero */}
          <div className="flex items-center justify-center p-6 min-h-[340px]" style={{ background: "#F5EFE7" }}>
            {(previewUrls && previewUrls[0]) || photoUrl ? (
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ maxWidth: 300, aspectRatio: "3/4" }}>
                {/* Base photo fills full width */}
                <Image
                  src={(previewUrls && previewUrls[0]) || photoUrl!}
                  alt="Your photo"
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ objectPosition: "top center" }}
                />

                {/* RIGHT half: tinted overlay + recommended style hair drawing */}
                <div
                  className="absolute top-0 right-0 bottom-0 overflow-hidden"
                  style={{ width: "50%", background: "rgba(61,43,31,0.10)" }}
                >
                  {/* clip the HairOverlay to the right half only */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 50 140"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* right-side hair for first recommended style at higher opacity */}
                    <path
                      d="M18 30 C32 50 36 80 34 120"
                      stroke="rgba(255,255,255,0.92)" strokeWidth="2" fill="none"
                      className="hair-line" pathLength={1}
                      style={{ animationDelay: "0.2s" } as React.CSSProperties}
                    />
                    <path
                      d="M20 28 C34 50 38 85 36 125"
                      stroke="rgba(255,255,255,0.65)" strokeWidth="1.4" fill="none"
                      className="hair-line" pathLength={1}
                      style={{ animationDelay: "0.3s" } as React.CSSProperties}
                    />
                    <path
                      d="M14 16 C18 10 42 10 46 16"
                      stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" fill="none"
                      className="hair-line" pathLength={1}
                      style={{ animationDelay: "0.4s" } as React.CSSProperties}
                    />
                  </svg>
                </div>

                {/* Vertical divider line */}
                <div className="absolute top-0 bottom-0" style={{ left: "50%", width: 2, background: "rgba(255,255,255,0.7)", zIndex: 10 }} />

                {/* Labels */}
                <div className="absolute bottom-3 left-3" style={{ zIndex: 11 }}>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>Before</span>
                </div>
                <div className="absolute bottom-3 right-3" style={{ zIndex: 11 }}>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)", color: "#C8A96E" }}>After</span>
                </div>

                {/* dashed oval tracking head outline */}
                <div className="absolute pointer-events-none" style={{
                  border: "2px dashed rgba(255,255,255,0.5)",
                  borderRadius: "50% 50% 45% 45% / 58% 58% 42% 42%",
                  top: "4%", left: "14%", right: "14%", bottom: "30%",
                  zIndex: 9,
                }} />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 220, height: 280, background: "#EDE3D8", border: "2px dashed #C8B89A" }}>
                <span style={{ color: "#9C7D5B", fontSize: 36 }}>&#128100;</span>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="p-5 space-y-4" style={{ borderLeft: "1px solid #E8DDD0" }}>
            {/* Best Features */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Best Features</p>
              <ul className="space-y-3">
                {resolvedFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>
                      {i === 0 ? "◎" : i === 1 ? "◉" : "●"}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {/* Styling Tips */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Styling Tips</p>
              <ul className="space-y-3">
                {resolvedTips.map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs" style={{ color: "#6B5344" }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>
                      {i === 0 ? <IconScissors /> : i === 1 ? <IconWave /> : <IconSparkle />}
                    </span>
                    <span className="leading-tight">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Most Flattering Styles ── */}
        <div className="px-6 py-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
          <div className="flex items-center justify-center gap-3 mb-5">
            <span style={{ color: "#C8A96E" }}>&#10022;</span>
            <p className={sectionTitle} style={sT}>Most Flattering Styles</p>
            <span style={{ color: "#C8A96E" }}>&#10022;</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {flatteningStyles.map((s, i) => {
              const tex   = textureFromStyle(s.name);
              const maint = maintenanceFromStyle(s.name);
              const mc    = MAINTENANCE_COLORS[maint.level];
              return (
                <div
                  key={s.name}
                  className="style-card flex flex-col rounded-2xl overflow-hidden"
                  style={{ border: "1px solid #E8DDD0", background: "#F5EFE7" }}
                >
                  {/* name + texture badge row */}
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5" style={{ borderBottom: "1px solid #E8DDD0" }}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold truncate" style={{ color: "#3D2B1F" }}>{s.name}</p>
                    <span
                      className="shrink-0 text-[8px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: tex.bg, color: tex.color }}
                    >
                      {tex.label}
                    </span>
                  </div>

                  {/* photo + hair overlay + hover expand */}
                  <div className="relative w-full" style={{ aspectRatio: "3/4", background: "#EDE3D8" }}>
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={s.name}
                        fill
                        unoptimized
                        className="object-cover"
                        style={{ objectPosition: "top center" }}
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#DFD0BE,#C8B09A)" }} />
                    )}
                    <HairOverlay style={s.name} animate delay={i * 0.09} />
                    {/* green check badge */}
                    <div className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: "#7BA05B" }}>
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                    {/* hover expand: full description overlay */}
                    <div
                      className="desc-overlay absolute inset-0 flex items-end"
                      style={{ background: "linear-gradient(to top, rgba(30,18,10,0.82) 0%, rgba(30,18,10,0.0) 55%)" }}
                    >
                      <p className="text-[9px] text-white leading-tight p-2 pb-3">{s.description}</p>
                    </div>
                  </div>

                  {/* maintenance dots */}
                  <div className="flex items-center justify-between px-2 py-1.5" style={{ borderTop: "1px solid #E8DDD0" }}>
                    <span className="text-[8px] font-medium" style={{ color: mc.filled }}>Maint.</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: dot <= maint.level ? mc.filled : mc.empty }}
                        />
                      ))}
                      <span className="text-[8px] ml-0.5" style={{ color: mc.filled }}>{maint.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Styles to Consider + Best Length ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]" style={{ borderBottom: "1px solid #E8DDD0" }}>

          {/* Styles to Consider */}
          <div className="px-6 py-6" style={{ borderRight: "1px solid #E8DDD0" }}>
            <p className={sectionTitle} style={sT}>Styles to Consider</p>
            <div className="grid grid-cols-3 gap-3">
              {considerStyles.map((a, i) => (
                <div key={i} className="flex flex-col rounded-2xl overflow-hidden" style={{ border: "1px solid #F0D8CC", background: "#FDF5F0" }}>
                  <div className="text-center py-1.5 px-1" style={{ borderBottom: "1px solid #F0D8CC" }}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold truncate" style={{ color: "#C06B3E" }}>{a.split(" ").slice(0, 3).join(" ")}</p>
                  </div>
                  <div className="relative w-full" style={{ aspectRatio: "3/4", background: "#EDE3D8" }}>
                    {photoUrl ? (
                      <>
                        <Image src={photoUrl} alt={a} fill unoptimized className="object-cover" style={{ objectPosition: "top center" }} />
                        <div className="absolute inset-0" style={{ background: "rgba(192,107,62,0.18)" }} />
                      </>
                    ) : (
                      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#E8DDD0,#D0C0B0)" }} />
                    )}
                    <HairOverlay style={a} />
                    <div className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: "#C06B3E" }}>
                      <Minus className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[9px] leading-tight text-center" style={{ color: "#6B5344" }}>{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Length */}
          <div className="px-6 py-6">
            <p className={sectionTitle} style={sT}>Best Length</p>
            <LengthDiagram recommended={bestLength} />
            <p className="text-xs text-center mt-2 font-semibold" style={{ color: "#9C7D5B" }}>&#9825; {bestLength}</p>
          </div>
        </div>

        {/* ── Hair Type Match + Color Direction ── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: "1px solid #E8DDD0" }}>

          {/* Hair Type Match */}
          <div className="px-6 py-6 flex flex-col gap-4" style={{ borderRight: "1px solid #E8DDD0" }}>
            <p className={sectionTitle} style={sT}>Hair Type Match</p>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex flex-col items-center gap-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>&#8779;</span>
                <p className="text-xs font-semibold text-center" style={{ color: "#3D2B1F" }}>{resolvedHairType}</p>
              </div>
              <div className="flex flex-col gap-2">
                {HAIR_BENEFITS.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-xs" style={{ color: "#6B5344" }}>
                    <Check className="h-4 w-4 shrink-0" style={{ color: "#7BA05B" }} />{b}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Color Direction */}
          <div className="px-6 py-6 flex flex-col gap-4">
            <p className={sectionTitle} style={sT}>Best Color Direction</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {data.colors.map((c) => (
                <div key={c.hex} className="flex flex-col items-center gap-1.5">
                  <span className="h-12 w-12 rounded-full shadow-md" style={{ backgroundColor: c.hex, border: "2px solid #fff" }} />
                  <p className="text-[10px] text-center leading-tight max-w-[52px]" style={{ color: "#6B5344" }}>{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4 px-6" style={{ background: "#F0E8DC" }}>
          <p className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: "#9C7D5B" }}>
            &#9825;&nbsp;{flatteningStyles[0]?.name ?? "Natural Layers"} &bull; {flatteningStyles[1]?.name ?? "Soft Waves"} = Your Best Look&nbsp;&#10022;
          </p>
        </div>
      </div>
    </>
  );
}
