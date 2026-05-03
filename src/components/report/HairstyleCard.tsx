"use client";

import Image from "next/image";
import { Check, Minus } from "lucide-react";
import type { HairstyleResult } from "@/types/report";

// ─── tiny inline icons (SVG) to keep the card self-contained ──────────────
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
function IconFace() {
  return (
    <svg viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-14 w-10 mx-auto">
      <ellipse cx="20" cy="24" rx="16" ry="20" />
      <line x1="20" y1="4" x2="20" y2="44" strokeDasharray="2 2" />
    </svg>
  );
}

// ─── Best-Length silhouette diagram ───────────────────────────────────────
function LengthDiagram({ recommended }: { recommended: string }) {
  const levels = [
    { label: "Short",           top: "18%" },
    { label: "Collarbone",      top: "35%" },
    { label: "Below Shoulder",  top: "54%" },
    { label: "Mid Back",        top: "72%" },
  ];
  return (
    <div className="relative flex flex-col items-center" style={{ minHeight: 200 }}>
      {/* side-profile silhouette */}
      <svg viewBox="0 0 80 200" className="h-48 w-auto" fill="none" stroke="#9C7D5B" strokeWidth="1.5">
        {/* simplified side-profile head+neck+shoulder */}
        <path d="M40 10 C55 10 65 25 65 45 C65 65 58 80 50 88 L50 110 C50 115 55 118 60 120 L75 130" strokeLinecap="round" />
        <path d="M40 10 C25 10 18 25 18 45 C18 65 22 75 28 85 L28 110 C28 115 20 120 10 130" strokeLinecap="round" />
        <ellipse cx="40" cy="38" rx="22" ry="28" strokeDasharray="0" />
        {/* hair flowing down */}
        <path d="M18 45 C10 70 8 110 10 160" strokeDasharray="3 2" />
        <path d="M62 45 C68 70 70 110 68 160" strokeDasharray="3 2" />
      </svg>

      {/* dashed length lines */}
      {levels.map(({ label, top }) => {
        const isRec = recommended.toLowerCase().includes(label.toLowerCase().split(" ")[0]);
        return (
          <div
            key={label}
            className="absolute left-0 right-0 flex items-center gap-2"
            style={{ top }}
          >
            <div
              className="flex-1 border-t"
              style={{ borderStyle: "dashed", borderColor: isRec ? "#9C7D5B" : "#C8B89A", opacity: isRec ? 1 : 0.5 }}
            />
            <span
              className="text-[11px] whitespace-nowrap font-medium pr-1"
              style={{ color: isRec ? "#9C7D5B" : "#A89070" }}
            >
              {isRec && "♥ "}{label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Hair type benefits ────────────────────────────────────────────────────
const HAIR_BENEFITS = ["Adds Volume", "Enhances Texture", "Frames Face Beautifully"];

// ─── Main card ─────────────────────────────────────────────────────────────
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
  const flatteningStyles = data.styles.slice(0, 5);
  const avoidStyles = data.styles.slice(5, 9);  // fallback: use styles 5-8 as "consider/avoid"
  const bestLength = data.lengths[1]?.name ?? "Collarbone to Below Shoulder";
  const resolvedHairType = hairType ?? "Wavy / Curly";

  const resolvedFaceShape = faceShape ?? "Oval";
  const resolvedTraits = faceTraits ?? data.avoid.slice(0, 3).map(() => "");
  const resolvedBestFeatures = bestFeatures ?? ["Expressive eyes", "Soft cheekbones", "Balanced facial features"];
  const resolvedStylingTips = stylingTips ?? data.avoid.slice(0, 3);

  const hairGoals = [
    { icon: <IconFace />, label: "Frame the face" },
    { icon: <IconWave />, label: "Add movement & volume" },
    { icon: <IconSparkle />, label: "Enhance natural texture" },
  ];

  // section title style
  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold text-center mb-4";
  const sectionTitleColor = { color: "#9C7D5B" };

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", fontFamily: "inherit" }}
    >
      {/* ── Header ── */}
      <div className="text-center pt-8 pb-4 px-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3 mb-1">
          <span style={{ color: "#C8A96E", fontSize: 18 }}>✦</span>
          <h2 className="text-3xl font-serif" style={{ color: "#3D2B1F", letterSpacing: "0.01em" }}>
            Hairstyle Analysis
          </h2>
          <span style={{ color: "#C8A96E", fontSize: 18 }}>✦</span>
        </div>
        <p className="text-sm" style={{ color: "#9C7D5B" }}>Find Styles That Flatter You</p>
      </div>

      {/* ── Hero: 3-column layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_220px] gap-0" style={{ borderBottom: "1px solid #E8DDD0" }}>

        {/* Left panel */}
        <div className="p-5 space-y-5" style={{ borderRight: "1px solid #E8DDD0" }}>
          {/* Face Shape */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#9C7D5B" }}>
              Face Shape
            </p>
            <p className="font-serif text-lg mb-3" style={{ color: "#3D2B1F" }}>{resolvedFaceShape}</p>
            <div className="flex justify-center mb-3">
              <IconFace />
            </div>
            <ul className="space-y-1.5">
              {resolvedTraits.slice(0, 3).map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#7BA05B" }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Hair Goals */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>
              Hair Goals
            </p>
            <ul className="space-y-3">
              {hairGoals.map((g) => (
                <li key={g.label} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#EDE3D8", color: "#9C7D5B" }}
                  >
                    {g.icon}
                  </span>
                  {g.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Centre: user photo */}
        <div className="flex items-center justify-center p-4" style={{ background: "#F5EFE7" }}>
          {(previewUrls && previewUrls[0]) || photoUrl ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ maxWidth: 280 }}>
              <Image
                src={(previewUrls && previewUrls[0]) || photoUrl!}
                alt="Your photo"
                width={560}
                height={700}
                unoptimized
                className="w-full object-cover rounded-2xl"
                style={{ maxHeight: 380 }}
              />
              {/* dashed oval overlay hint */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  border: "2px dashed rgba(255,255,255,0.55)",
                  borderRadius: "50% 50% 45% 45% / 60% 60% 40% 40%",
                  top: "6%", left: "15%", right: "15%", bottom: "10%",
                }}
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 220, height: 280, background: "#EDE3D8", border: "2px dashed #C8B89A" }}
            >
              <IconFace />
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="p-5 space-y-5" style={{ borderLeft: "1px solid #E8DDD0" }}>
          {/* Best Features */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>
              Best Features
            </p>
            <ul className="space-y-3">
              {resolvedBestFeatures.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#EDE3D8", color: "#9C7D5B" }}
                  >
                    {i === 0 ? "👁" : i === 1 ? "✦" : "◎"}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Styling Tips */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>
              Styling Tips
            </p>
            <ul className="space-y-3">
              {resolvedStylingTips.slice(0, 3).map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#EDE3D8", color: "#9C7D5B" }}
                  >
                    {i === 0 ? <IconScissors /> : i === 1 ? <IconWave /> : <IconSparkle />}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Most Flattering Styles ── */}
      <div className="px-6 py-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3 mb-5">
          <span style={{ color: "#C8A96E" }}>♥</span>
          <p className={sectionTitle} style={sectionTitleColor}>Most Flattering Styles</p>
          <span style={{ color: "#C8A96E" }}>♥</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {flatteningStyles.map((s, i) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4", background: "#EDE3D8" }}>
                {(previewUrls && previewUrls[i + 1]) || photoUrl ? (
                  <>
                    <Image
                      src={(previewUrls && previewUrls[i + 1]) || photoUrl!}
                      alt={s.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {/* subtle tint to differentiate cards */}
                    <div className="absolute inset-0" style={{ background: "rgba(61,43,31,0.06)" }} />
                    {/* style name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1" style={{ background: "rgba(0,0,0,0.22)" }}>
                      <span className="text-[10px] text-white font-medium block text-center">{s.name}</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-center px-2" style={{ color: "#9C7D5B" }}>{s.name}</span>
                  </div>
                )}
                {/* green checkmark badge */}
                <div
                  className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ background: "#7BA05B" }}
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <p className="text-xs text-center font-medium" style={{ color: "#3D2B1F" }}>{s.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Styles to Consider (avoid) + Best Length ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px]" style={{ borderBottom: "1px solid #E8DDD0" }}>

        {/* Styles to consider / avoid */}
        <div className="px-6 py-6" style={{ borderRight: "1px solid #E8DDD0" }}>
          <p className={sectionTitle} style={sectionTitleColor}>Styles to Consider</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.avoid.slice(0, 4).map((a, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="relative w-full rounded-2xl overflow-hidden"
                  style={{ aspectRatio: "3/4", background: "#EDE3D8" }}
                >
                  {photoUrl ? (
                    <>
                      <Image src={photoUrl} alt={a} fill unoptimized className="object-cover" />
                      <div className="absolute inset-0" style={{ background: "rgba(192,107,62,0.18)" }} />
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <span className="text-[10px] text-white font-medium text-center leading-tight">{a}</span>
                      </div>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-center px-2" style={{ color: "#9C7D5B" }}>{a}</span>
                  )}
                  {/* minus badge */}
                  <div
                    className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ background: "#C06B3E" }}
                  >
                    <Minus className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-center" style={{ color: "#6B5344" }}>{a.split(" ").slice(0, 3).join(" ")}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Best Length diagram */}
        <div className="px-6 py-6">
          <p className={sectionTitle} style={sectionTitleColor}>Best Length</p>
          <LengthDiagram recommended={bestLength} />
          <p className="text-xs text-center mt-3 font-medium" style={{ color: "#9C7D5B" }}>
            ♥ {bestLength}
          </p>
        </div>
      </div>

      {/* ── Hair Type Match + Best Color Direction ── */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: "1px solid #E8DDD0" }}>

        {/* Hair Type Match */}
        <div className="px-6 py-6 flex flex-col gap-4" style={{ borderRight: "1px solid #E8DDD0" }}>
          <p className={sectionTitle} style={sectionTitleColor}>Hair Type Match</p>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex flex-col items-center gap-1">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-xl"
                style={{ background: "#EDE3D8", color: "#9C7D5B" }}
              >
                ≋
              </span>
              <p className="text-xs font-medium" style={{ color: "#3D2B1F" }}>{resolvedHairType}</p>
            </div>
            <div className="flex flex-col gap-2">
              {HAIR_BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-2 text-xs" style={{ color: "#6B5344" }}>
                  <Check className="h-4 w-4 shrink-0" style={{ color: "#7BA05B" }} />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Best Color Direction */}
        <div className="px-6 py-6 flex flex-col gap-4">
          <p className={sectionTitle} style={sectionTitleColor}>Best Color Direction</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {data.colors.map((c) => (
              <div key={c.hex} className="flex flex-col items-center gap-1.5">
                <span
                  className="h-12 w-12 rounded-full shadow-md"
                  style={{ backgroundColor: c.hex, border: "2px solid #fff" }}
                />
                <p className="text-[10px] text-center leading-tight max-w-[52px]" style={{ color: "#6B5344" }}>
                  {c.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer banner ── */}
      <div
        className="text-center py-4 px-6"
        style={{ background: "#F0E8DC" }}
      >
        <p className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: "#9C7D5B" }}>
          ♥&nbsp;{flatteningStyles[0]?.name ?? "Natural Layers"} + {flatteningStyles[1]?.name ?? "Soft Waves"} = Your Best Look&nbsp;✦
        </p>
      </div>
    </div>
  );
}
