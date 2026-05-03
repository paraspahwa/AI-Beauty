"use client";

import Image from "next/image";
import { Check, X, Scale, Eye } from "lucide-react";
import type { GlassesResult } from "@/types/report";

// ── Frame draw-on animation ─────────────────────────────────────────────────
// Uses pathLength="1" on every lens/temple element so stroke-dasharray: 1
// equals the full perimeter regardless of shape type. Each element animates
// from dashoffset 1 → 0 with a per-element stagger via animation-delay.
const FRAME_ANIMATION_CSS = `
@keyframes specs-draw {
  from { stroke-dashoffset: 1; opacity: 0.2; }
  6%   { opacity: 1; }
  to   { stroke-dashoffset: 0; opacity: 1; }
}
.specs-frame-el {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: specs-draw 0.65s cubic-bezier(0.4,0,0.2,1) forwards;
}
`;

// ── Face-shape accent colours ─────────────────────────────────────────────
const SHAPE_ACCENT: Record<string, { bg: string; text: string; border: string }> = {
  oval:      { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B" },
  round:     { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B" },
  circle:    { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B" },
  square:    { bg: "#DBEAFE", text: "#1D4ED8", border: "#60A5FA" },
  rectangle: { bg: "#DBEAFE", text: "#1D4ED8", border: "#60A5FA" },
  heart:     { bg: "#FCE7F3", text: "#BE185D", border: "#F472B6" },
  diamond:   { bg: "#F3E8FF", text: "#7C3AED", border: "#C084FC" },
  oblong:    { bg: "#D1FAE5", text: "#065F46", border: "#34D399" },
};
function shapeAccent(shape?: string) {
  const key = Object.keys(SHAPE_ACCENT).find((k) =>
    (shape ?? "").toLowerCase().includes(k)
  );
  return SHAPE_ACCENT[key ?? "oval"];
}

// ── Inline SVG icons ────────────────────────────────────────────────────────
function IconFaceOutline({ shape }: { shape?: string }) {
  // Adjust rx/ry to hint at the actual face shape
  const s  = (shape ?? "").toLowerCase();
  const rx = s.includes("round") || s.includes("circle") ? 15
    : s.includes("square") ? 13
    : s.includes("heart") ? 14
    : s.includes("diamond") ? 11
    : 13;  // oval / default
  const ry = s.includes("round") || s.includes("circle") ? 15
    : s.includes("square") ? 14
    : 19;
  return (
    <svg viewBox="0 0 40 50" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-10 mx-auto">
      {/* filled amber circle accent behind */}
      <circle cx="20" cy="25" r="18" fill="currentColor" opacity="0.08" />
      <ellipse cx="20" cy="26" rx={rx} ry={ry} />
      {/* chin point for heart/diamond */}
      {(s.includes("heart") || s.includes("diamond")) && (
        <path d="M14 40 Q20 46 26 40" strokeDasharray="2 1" opacity="0.5" />
      )}
      {/* symmetry guide line */}
      <line x1="20" y1="8" x2="20" y2="44" strokeDasharray="2 2" opacity="0.35" />
    </svg>
  );
}
function IconFaceWithGlasses() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-6 w-6">
      <ellipse cx="12" cy="14" rx="8" ry="10" />
      <rect x="5" y="9" width="5" height="3" rx="1.5" />
      <rect x="14" y="9" width="5" height="3" rx="1.5" />
      <line x1="10" y1="10.5" x2="14" y2="10.5" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <circle cx="12" cy="12" r="3.5" />
      {[0,60,120,180,240,300].map((d) => (
        <line key={d}
          x1={12 + 6 * Math.cos(d * Math.PI / 180)} y1={12 + 6 * Math.sin(d * Math.PI / 180)}
          x2={12 + 9 * Math.cos(d * Math.PI / 180)} y2={12 + 9 * Math.sin(d * Math.PI / 180)}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" style={{ color: "#C8A96E" }}>
      <path d="M12 21C12 21 3 14 3 8a4 4 0 0 1 7-2.65A4 4 0 0 1 21 8c0 6-9 13-9 13z" />
    </svg>
  );
}

// ── Glasses frame illustrations ─────────────────────────────────────────────
// Each frame style has a carefully authored SVG in a fixed 64×28 viewBox.
// Temples extend outward, bridge is centred, lenses sit on the horizontal axis.
function FrameIllustration({ style, size = 48, animate = false, delay = 0 }: { style: string; size?: number; animate?: boolean; delay?: number }) {
  const s    = style.toLowerCase();
  const h    = Math.round(size * 0.44);
  const col  = "#3D2B1F";
  const sw   = size < 44 ? 1.6 : 2;

  const vb = "0 0 64 28";
  const lx = 4,  lw = 24, ly = 4, lh = 20;
  const rx2 = 36, rw = 24;
  const cy = ly + lh / 2;  // = 14

  // When animate=true, every drawn element gets pathLength="1" so that
  // stroke-dasharray/dashoffset of 1 equals the full path length.
  // Each piece is staggered: left lens → right lens → bridge → temples.
  function ac(extraDelay = 0): React.SVGProps<SVGElement> {
    if (!animate) return {};
    return {
      className: "specs-frame-el",
      pathLength: 1,
      style: { animationDelay: `${delay + extraDelay}s` } as React.CSSProperties,
    };
  }

  function Temples() {
    return (
      <>
        <line x1="0" y1={cy} x2={lx} y2={cy} stroke={col} strokeWidth={sw} strokeLinecap="round" {...(ac(0.30) as React.SVGProps<SVGLineElement>)} />
        <line x1={rx2 + rw} y1={cy} x2="64" y2={cy} stroke={col} strokeWidth={sw} strokeLinecap="round" {...(ac(0.38) as React.SVGProps<SVGLineElement>)} />
        <line x1={lx + lw} y1={cy} x2={rx2} y2={cy} stroke={col} strokeWidth={sw * 0.7} {...(ac(0.22) as React.SVGProps<SVGLineElement>)} />
      </>
    );
  }

  let lenses: React.ReactNode;

  if (s.includes("cat")) {
    lenses = (
      <>
        <path d={`M${lx} ${ly+lh} Q${lx} ${ly+4} ${lx+6} ${ly} L${lx+lw} ${ly-2} L${lx+lw} ${ly+lh} Z`}
          fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" {...(ac(0) as React.SVGProps<SVGPathElement>)} />
        <path d={`M${rx2} ${ly-2} L${rx2+lw-6} ${ly} Q${rx2+lw} ${ly+4} ${rx2+lw} ${ly+lh} L${rx2} ${ly+lh} Z`}
          fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" {...(ac(0.10) as React.SVGProps<SVGPathElement>)} />
      </>
    );
  } else if (s.includes("aviator")) {
    lenses = (
      <>
        <path d={`M${lx+lw/2} ${ly+2} Q${lx} ${ly} ${lx} ${cy} Q${lx} ${ly+lh} ${lx+lw/2} ${ly+lh} Q${lx+lw} ${ly+lh} ${lx+lw} ${cy} Q${lx+lw} ${ly} ${lx+lw/2} ${ly+2} Z`}
          fill="none" stroke={col} strokeWidth={sw} {...(ac(0) as React.SVGProps<SVGPathElement>)} />
        <path d={`M${rx2+rw/2} ${ly+2} Q${rx2} ${ly} ${rx2} ${cy} Q${rx2} ${ly+lh} ${rx2+rw/2} ${ly+lh} Q${rx2+rw} ${ly+lh} ${rx2+rw} ${cy} Q${rx2+rw} ${ly} ${rx2+rw/2} ${ly+2} Z`}
          fill="none" stroke={col} strokeWidth={sw} {...(ac(0.10) as React.SVGProps<SVGPathElement>)} />
      </>
    );
  } else if (s.includes("square") || s.includes("rectangle")) {
    lenses = (
      <>
        <rect x={lx} y={ly} width={lw} height={lh} rx="1" fill="none" stroke={col} strokeWidth={sw} {...(ac(0) as React.SVGProps<SVGRectElement>)} />
        <rect x={rx2} y={ly} width={rw} height={lh} rx="1" fill="none" stroke={col} strokeWidth={sw} {...(ac(0.10) as React.SVGProps<SVGRectElement>)} />
      </>
    );
  } else if (s.includes("round") || s.includes("circle")) {
    lenses = (
      <>
        <ellipse cx={lx + lw/2} cy={cy} rx={lw/2} ry={lh/2} fill="none" stroke={col} strokeWidth={sw} {...(ac(0) as React.SVGProps<SVGEllipseElement>)} />
        <ellipse cx={rx2 + rw/2} cy={cy} rx={rw/2} ry={lh/2} fill="none" stroke={col} strokeWidth={sw} {...(ac(0.10) as React.SVGProps<SVGEllipseElement>)} />
      </>
    );
  } else if (s.includes("geometric") || s.includes("hexagon") || s.includes("angular")) {
    const hx = (bx: number, d: number) => {
      const cx2 = bx + lw / 2, r = lw / 2, ry2 = lh / 2;
      const pts = [0,60,120,180,240,300].map((deg) =>
        `${cx2 + r * Math.cos(deg*Math.PI/180)},${cy + ry2 * Math.sin(deg*Math.PI/180)}`
      ).join(" ");
      return <polygon points={pts} fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" {...(ac(d) as React.SVGProps<SVGPolygonElement>)} />;
    };
    lenses = <>{hx(lx, 0)}{hx(rx2, 0.10)}</>;
  } else if (s.includes("oval") || s.includes("wayfar")) {
    lenses = (
      <>
        <ellipse cx={lx + lw/2} cy={cy} rx={lw/2} ry={lh/2 - 1} fill="none" stroke={col} strokeWidth={sw} {...(ac(0) as React.SVGProps<SVGEllipseElement>)} />
        <ellipse cx={rx2 + rw/2} cy={cy} rx={rw/2} ry={lh/2 - 1} fill="none" stroke={col} strokeWidth={sw} {...(ac(0.10) as React.SVGProps<SVGEllipseElement>)} />
      </>
    );
  } else {
    lenses = (
      <>
        <rect x={lx} y={ly} width={lw} height={lh} rx="5" fill="none" stroke={col} strokeWidth={sw} {...(ac(0) as React.SVGProps<SVGRectElement>)} />
        <rect x={rx2} y={ly} width={rw} height={lh} rx="5" fill="none" stroke={col} strokeWidth={sw} {...(ac(0.10) as React.SVGProps<SVGRectElement>)} />
      </>
    );
  }

  return (
    <svg viewBox={vb} fill="none" style={{ width: size, height: h, display: "block" }}>
      {lenses}
      <Temples />
    </svg>
  );
}

// ── Fit guide — frontal face with labelled frame measurements ────────────────
function FitGuideIllustration() {
  // viewBox 0 0 100 110: face centred, glasses at eye level, annotation lines
  return (
    <svg viewBox="0 0 100 110" fill="none" className="h-28 w-auto mx-auto">
      {/* ── face outline ── */}
      <ellipse cx="50" cy="48" rx="28" ry="35" stroke="#C8B89A" strokeWidth="1.2" strokeDasharray="3 2" />
      {/* ── neck ── */}
      <line x1="42" y1="82" x2="40" y2="96" stroke="#C8B89A" strokeWidth="1.2" />
      <line x1="58" y1="82" x2="60" y2="96" stroke="#C8B89A" strokeWidth="1.2" />

      {/* ── eyebrows ── */}
      <path d="M32 38 Q38 34 44 38" stroke="#9C7D5B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M56 38 Q62 34 68 38" stroke="#9C7D5B" strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* ── frame: rectangular lenses + bridge + temples ── */}
      {/* left lens */}
      <rect x="22" y="41" width="22" height="14" rx="2.5" stroke="#3D2B1F" strokeWidth="2" />
      {/* right lens */}
      <rect x="56" y="41" width="22" height="14" rx="2.5" stroke="#3D2B1F" strokeWidth="2" />
      {/* bridge */}
      <line x1="44" y1="48" x2="56" y2="48" stroke="#3D2B1F" strokeWidth="1.5" />
      {/* left temple — follows face curve */}
      <line x1="22" y1="48" x2="12" y2="48" stroke="#3D2B1F" strokeWidth="1.8" strokeLinecap="round" />
      {/* right temple */}
      <line x1="78" y1="48" x2="88" y2="48" stroke="#3D2B1F" strokeWidth="1.8" strokeLinecap="round" />

      {/* ── annotation: top of frame follows brows ── */}
      <line x1="22" y1="41" x2="22" y2="36" stroke="#C8A96E" strokeWidth="0.8" strokeDasharray="2 1" />
      <line x1="78" y1="41" x2="78" y2="36" stroke="#C8A96E" strokeWidth="0.8" strokeDasharray="2 1" />
      <line x1="22" y1="36" x2="78" y2="36" stroke="#C8A96E" strokeWidth="0.8" />
      <text x="50" y="33" textAnchor="middle" fontSize="5" fill="#C8A96E" fontWeight="600">frame width</text>

      {/* ── annotation: bridge sits on nose ── */}
      <line x1="50" y1="55" x2="50" y2="62" stroke="#C8A96E" strokeWidth="0.8" strokeDasharray="2 1" />
      <text x="50" y="67" textAnchor="middle" fontSize="5" fill="#C8A96E" fontWeight="600">bridge</text>

      {/* ── annotation: temples align with ears ── */}
      <text x="50" y="105" textAnchor="middle" fontSize="5" fill="#9C7D5B">temples align with ears</text>
    </svg>
  );
}

// ── Main card ──────────────────────────────────────────────────────────────
export function SpectaclesCard({
  data,
  photoUrl,
  previewUrls,
  faceShape,
  faceTraits,
}: {
  data: GlassesResult;
  photoUrl?: string;
  previewUrls?: string[];
  faceShape?: string;
  faceTraits?: string[];
}) {
  const goalIcons = [Scale, IconFaceWithGlasses, Eye];
  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold text-center";
  const warmBrown = { color: "#9C7D5B" };
  const bg = { background: "#FDFAF6", border: "1px solid #E8DDD0" };

  const quickTips = [
    { icon: <IconSun />, text: "Consider anti-reflective & UV protection" },
    { icon: <IconFaceOutline />, text: "Try before you buy if possible" },
    { icon: <IconHeart />, text: "Choose frames that make you feel confident!" },
  ];

  const fitPoints = [
    "Top of frame follows brows",
    "Frames sit comfortably on bridge",
    "Temples align with ears",
  ];

  const accent = shapeAccent(faceShape);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FRAME_ANIMATION_CSS }} />
    <div className="rounded-3xl overflow-hidden" style={bg}>

      {/* ── Header ── */}
      <div className="text-center pt-8 pb-4 px-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3 mb-1">
          <span style={{ color: "#C8A96E", fontSize: 16 }}>✦</span>
          <h2 className="text-3xl font-serif" style={{ color: "#3D2B1F" }}>Spectacles Guide</h2>
          <span style={{ color: "#C8A96E", fontSize: 16 }}>✦</span>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#9C7D5B" }}>
          Find Frames That Flatter You
        </p>
      </div>

      {/* ── Hero 3-col ── */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_200px]" style={{ borderBottom: "1px solid #E8DDD0" }}>

        {/* Left: Your Face Shape */}
        <div className="p-5 flex flex-col gap-3" style={{ borderRight: "1px solid #E8DDD0" }}>
          <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>
              Your Face Shape
            </p>
            {/* Shape-specific accent badge */}
            <div
              className="mx-auto mb-2 flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: accent.bg, border: `2px solid ${accent.border}`, color: accent.text }}
            >
              <IconFaceOutline shape={faceShape} />
            </div>
            <p className="font-serif text-lg text-center mt-1 mb-3 font-semibold" style={{ color: accent.text }}>
              {faceShape ?? "Oval"}
            </p>
            <ul className="space-y-1.5">
              {(faceTraits ?? ["Balanced proportions", "Gentle curves", "Slightly narrower chin"]).slice(0, 3).map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "#6B5344" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "#9C7D5B" }}>•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Centre: photo */}
        <div className="flex items-center justify-center p-4 min-h-[280px]" style={{ background: "#F5EFE7" }}>
          {(previewUrls && previewUrls[0]) || photoUrl ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ maxWidth: 280, width: "100%" }}>
              <Image
                src={(previewUrls && previewUrls[0]) || photoUrl!}
                alt="Your photo with glasses"
                width={560}
                height={700}
                unoptimized
                className="w-full object-cover rounded-2xl"
                style={{ maxHeight: 380 }}
              />
              {/* dashed oval — tracks head outline, stops at chin (~85%) */}
              <div className="absolute pointer-events-none" style={{
                border: "2px dashed rgba(255,255,255,0.65)",
                borderRadius: "50%",
                top: "4%", left: "18%", right: "18%", bottom: "15%",
              }} />
              {/* Frame-width measurement indicator at eye level (~35% from top) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* horizontal measurement bar */}
                <line x1="18" y1="35" x2="82" y2="35" stroke="#F59E0B" strokeWidth="0.6" strokeDasharray="2 1" opacity="0.85" />
                {/* end ticks */}
                <line x1="18" y1="32" x2="18" y2="38" stroke="#F59E0B" strokeWidth="0.8" />
                <line x1="82" y1="32" x2="82" y2="38" stroke="#F59E0B" strokeWidth="0.8" />
                {/* label pill */}
                <rect x="36" y="29" width="28" height="8" rx="4" fill="rgba(0,0,0,0.55)" />
                <text x="50" y="35.2" textAnchor="middle" fontSize="4.5" fill="#F59E0B" fontWeight="700">~135 mm</text>
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl" style={{
              width: 220, height: 280, background: "#EDE3D8", border: "2px dashed #C8B89A",
            }}>
              <span style={{ color: "#9C7D5B", fontSize: 36 }}>👤</span>
            </div>
          )}
        </div>

        {/* Right: Frame Goals */}
        <div className="p-5 flex flex-col gap-3" style={{ borderLeft: "1px solid #E8DDD0" }}>
          <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>
              Frame Goals
            </p>
            <ul className="space-y-3">
              {data.goals.slice(0, 3).map((g, i) => {
                const Icon = goalIcons[i % goalIcons.length];
                return (
                  <li key={g} className="flex items-start gap-3 text-xs" style={{ color: "#6B5344" }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>
                      {typeof Icon === "function" && Icon.toString().includes("svg") ? <Icon /> : <Icon className="h-4 w-4" />}
                    </span>
                    {g}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Try-On: Flattering Styles ── */}
      <div className="px-6 py-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3 mb-5">
          <span style={{ color: "#C8A96E" }}>✦</span>
          <p className={sectionTitle} style={warmBrown}>Try-On: Flattering Styles</p>
          <span style={{ color: "#C8A96E" }}>✦</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.recommended.slice(0, 5).map((r, i) => (
            <div key={r.style} className="flex flex-col rounded-2xl overflow-hidden" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              {/* Style name header */}
              <div className="text-center py-2 px-1" style={{ borderBottom: "1px solid #E8DDD0" }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#3D2B1F" }}>{r.style}</p>
              </div>
              {/* Photo or frame illustration */}
              <div className="flex items-center justify-center" style={{ aspectRatio: "3/4", background: "#EDE3D8", position: "relative" }}>
                {(previewUrls && previewUrls[i + 1]) || photoUrl ? (
                  <>
                    <Image
                        src={(previewUrls && previewUrls[i + 1]) || photoUrl!}
                        alt={r.style} fill unoptimized
                        className="object-cover"
                        style={{ objectPosition: "top center" }}
                      />
                      {/* subtle warm tint */}
                      <div className="absolute inset-0" style={{ background: "rgba(61,43,31,0.06)" }} />
                      {/* frame overlay at eye level — mix-blend-mode:multiply blends into skin tone */}
                      <div
                        className="absolute left-0 right-0 flex items-center justify-center"
                        style={{ top: "33%", mixBlendMode: "multiply" }}
                      >
                        <FrameIllustration style={r.style} size={90} animate delay={i * 0.08} />
                      </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-3">
                    <FrameIllustration style={r.style} size={56} />
                    <span style={{ color: "#9C7D5B", fontSize: 11, textAlign: "center" }}>{r.style}</span>
                  </div>
                )}
              </div>
              {/* Reason + heart */}
              <div className="p-2 text-center">
                <p className="text-[10px] leading-tight mb-1" style={{ color: "#6B5344" }}>{r.reason}</p>
                <IconHeart />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Frame Recommendations ── */}
      <div className="px-6 py-4" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span style={{ color: "#C8A96E" }}>✦</span>
          <p className={sectionTitle} style={warmBrown}>Frame Recommendations</p>
          <span style={{ color: "#C8A96E" }}>✦</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Good Choices */}
          <div className="rounded-2xl p-5" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#7BA05B" }}>
                <Check className="h-3.5 w-3.5 text-white" />
              </span>
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#3D2B1F" }}>Good Choices</p>
            </div>
            {/* Frame icon row */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {data.recommended.slice(0, 5).map((r) => (
                <div key={r.style} className="flex flex-col items-center gap-1">
                  <div className="rounded-lg p-2" style={{ background: "#EDE3D8" }}>
                    <FrameIllustration style={r.style} size={40} />
                  </div>
                  <span className="text-[9px]" style={{ color: "#9C7D5B" }}>{r.style}</span>
                </div>
              ))}
            </div>
            {/* Fit tips as checklist */}
            <ul className="space-y-2">
              {data.fitTips.slice(0, 4).map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#7BA05B" }} /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Avoid These */}
          <div className="rounded-2xl p-5" style={{ background: "#FDF5F0", border: "1px solid #F0D8CC" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#C06B3E" }}>
                <X className="h-3.5 w-3.5 text-white" />
              </span>
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#3D2B1F" }}>Avoid These</p>
            </div>
            {/* Avoid frame icon row */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {data.avoid.slice(0, 4).map((r) => (
                <div key={r.style} className="flex flex-col items-center gap-1">
                  <div className="rounded-lg p-2" style={{ background: "#F5E8E0" }}>
                    <FrameIllustration style={r.style} size={40} />
                  </div>
                  <span className="text-[9px]" style={{ color: "#C06B3E" }}>{r.style}</span>
                </div>
              ))}
            </div>
            <ul className="space-y-2">
              {data.avoid.map((r) => (
                <li key={r.style} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#C06B3E" }} />
                  <span>{r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom 3-col: Colors | Fit Guide | Quick Tips ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderTop: "1px solid #E8DDD0" } as React.CSSProperties}>

        {/* Best Colors & Finishes */}
        <div className="p-5 flex flex-col gap-3">
          <p className={sectionTitle} style={warmBrown}>Best Colors &amp; Finishes</p>
          <div className="flex gap-3 flex-wrap">
            {data.colors.map((c) => (
              <div key={c.hex} className="flex flex-col items-center gap-1.5">
                <span className="h-12 w-12 rounded-full shadow-md" style={{ backgroundColor: c.hex, border: "2px solid #fff" }} />
                <span className="text-[10px] text-center" style={{ color: "#6B5344" }}>{c.name}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] italic" style={{ color: "#9C7D5B" }}>
            Warm, natural tones complement your coloring beautifully.
          </p>
        </div>

        {/* Fit Guide */}
        <div className="p-5 flex flex-col items-center gap-3" style={{ borderLeft: "1px solid #E8DDD0", borderRight: "1px solid #E8DDD0" }}>
          <p className={sectionTitle} style={warmBrown}>Fit Guide</p>
          <FitGuideIllustration />
          <ul className="space-y-2 w-full">
            {fitPoints.map((pt) => (
              <li key={pt} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#7BA05B" }} /> {pt}
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Tips */}
        <div className="p-5 flex flex-col gap-3">
          <p className={sectionTitle} style={warmBrown}>Quick Tips</p>
          <ul className="space-y-4">
            {quickTips.map((qt, i) => (
              <li key={i} className="flex items-start gap-3 text-xs" style={{ color: "#6B5344" }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>
                  {qt.icon}
                </span>
                {qt.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    </>
  );
}
