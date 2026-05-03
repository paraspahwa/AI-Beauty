"use client";

import Image from "next/image";
import { Check, X, Scale, Eye } from "lucide-react";
import type { GlassesResult } from "@/types/report";

// ── Inline SVG icons ────────────────────────────────────────────────────────
function IconFaceOutline() {
  return (
    <svg viewBox="0 0 40 50" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-12 w-10 mx-auto">
      <ellipse cx="20" cy="25" rx="15" ry="20" />
      <line x1="20" y1="5" x2="20" y2="45" strokeDasharray="2 2" opacity="0.4" />
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

// ── Glasses frame illustrations (SVG) ─────────────────────────────────────
function FrameIllustration({ style, size = 48 }: { style: string; size?: number }) {
  const s = style.toLowerCase();
  const w = size, h = size * 0.45;
  // pick a rough shape per style name
  const rx = s.includes("round") ? h / 2
    : s.includes("cat") ? 0
    : s.includes("aviator") ? h * 0.4
    : s.includes("square") ? 2
    : 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} fill="none" stroke="#3D2B1F" strokeWidth="1.8"
      style={{ width: size, height: size * 0.45 }}>
      {/* bridge */}
      <line x1={w * 0.38} y1={h * 0.4} x2={w * 0.62} y2={h * 0.4} />
      {/* left temple */}
      <line x1={2} y1={h * 0.4} x2={w * 0.18} y2={h * 0.4} />
      {/* right temple */}
      <line x1={w * 0.82} y1={h * 0.4} x2={w - 2} y2={h * 0.4} />
      {/* left lens */}
      {s.includes("cat") ? (
        <path d={`M${w*0.18} ${h*0.7} Q${w*0.18} ${h*0.1} ${w*0.38} ${h*0.15} L${w*0.38} ${h*0.7} Z`} />
      ) : (
        <rect x={w * 0.18} y={h * 0.1} width={w * 0.2} height={h * 0.75} rx={rx} />
      )}
      {/* right lens */}
      {s.includes("cat") ? (
        <path d={`M${w*0.62} ${h*0.15} Q${w*0.82} ${h*0.1} ${w*0.82} ${h*0.7} L${w*0.62} ${h*0.7} Z`} />
      ) : (
        <rect x={w * 0.62} y={h * 0.1} width={w * 0.2} height={h * 0.75} rx={rx} />
      )}
    </svg>
  );
}

// ── Fit guide side-profile ─────────────────────────────────────────────────
function FitGuideIllustration() {
  return (
    <svg viewBox="0 0 80 100" fill="none" stroke="#9C7D5B" strokeWidth="1.5" className="h-28 w-auto mx-auto">
      {/* head silhouette */}
      <ellipse cx="38" cy="38" rx="22" ry="28" />
      {/* glasses on face */}
      <rect x="22" y="30" width="14" height="9" rx="2" strokeWidth="1.8" />
      <rect x="40" y="30" width="14" height="9" rx="2" strokeWidth="1.8" />
      <line x1="36" y1="34.5" x2="40" y2="34.5" strokeWidth="1.2" />
      {/* neck */}
      <line x1="30" y1="64" x2="28" y2="80" />
      <line x1="46" y1="64" x2="48" y2="80" />
      {/* eyebrow line hint */}
      <path d="M22 28 Q29 24 36 28" strokeDasharray="2 1" opacity="0.5" />
      <path d="M40 28 Q47 24 54 28" strokeDasharray="2 1" opacity="0.5" />
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

  return (
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
            <div style={{ color: "#9C7D5B" }}>
              <IconFaceOutline />
            </div>
            <p className="font-serif text-lg text-center mt-2 mb-3" style={{ color: "#3D2B1F" }}>
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
              {/* dashed oval */}
              <div className="absolute pointer-events-none" style={{
                border: "2px dashed rgba(255,255,255,0.6)",
                borderRadius: "50%",
                top: "5%", left: "12%", right: "12%", bottom: "5%",
              }} />
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
                    <Image src={(previewUrls && previewUrls[i + 1]) || photoUrl!} alt={r.style} fill unoptimized className="object-cover" />
                    {/* colour tint to differentiate style cards */}
                    <div className="absolute inset-0" style={{ background: "rgba(61,43,31,0.08)" }} />
                    {/* frame SVG overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FrameIllustration style={r.style} size={72} />
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
  );
}
