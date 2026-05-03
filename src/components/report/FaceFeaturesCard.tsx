"use client";

import Image from "next/image";
import type { FaceShapeResult, FeatureBreakdown } from "@/types/report";

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const bg    = pct >= 80 ? "rgba(123,210,158,0.15)" : pct >= 65 ? "rgba(201,149,107,0.15)" : "rgba(248,113,113,0.12)";
  const color = pct >= 80 ? "#6ECF9B"                : pct >= 65 ? "#C9956B"                : "#F87171";
  const border= pct >= 80 ? "rgba(110,207,155,0.25)" : pct >= 65 ? "rgba(201,149,107,0.25)" : "rgba(248,113,113,0.25)";
  const label = pct >= 80 ? "High confidence"        : pct >= 65 ? "Good confidence"        : "Low confidence";
  return (
    <span className="text-xs px-3 py-1 rounded-full" style={{ background: bg, color, border: `1px solid ${border}` }}>
      {label} · {pct}%
    </span>
  );
}

function IconFace() {
  return (
    <svg viewBox="0 0 40 50" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-9 w-8">
      <ellipse cx="20" cy="28" rx="15" ry="19" />
      <path d="M12 22 Q20 18 28 22" strokeLinecap="round" />
      <ellipse cx="14" cy="27" rx="3" ry="2.2" />
      <ellipse cx="26" cy="27" rx="3" ry="2.2" />
      <path d="M14 36 Q20 40 26 36" strokeLinecap="round" />
    </svg>
  );
}
function IconEyebrow() {
  return (
    <svg viewBox="0 0 50 22" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-11">
      <path d="M5 17 C10 7 22 4 36 8 C43 10 48 14 48 17" strokeLinecap="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-10">
      <path d="M2 11 C9 2 35 2 42 11 C35 20 9 20 2 11Z" />
      <circle cx="22" cy="11" r="5" />
      <circle cx="22" cy="11" r="2" fill="currentColor" />
    </svg>
  );
}
function IconNose() {
  return (
    <svg viewBox="0 0 28 38" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-9 w-7">
      <path d="M14 3 L14 24" strokeLinecap="round" />
      <path d="M14 24 C11 27 6 29 6 33 C6 36 9 37 14 37 C19 37 22 36 22 33 C22 29 17 27 14 24Z" />
    </svg>
  );
}
function IconCheeks() {
  return (
    <svg viewBox="0 0 48 26" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-11">
      <ellipse cx="11" cy="13" rx="9" ry="7" strokeDasharray="2.5 1.5" />
      <ellipse cx="37" cy="13" rx="9" ry="7" strokeDasharray="2.5 1.5" />
      <line x1="20" y1="13" x2="28" y2="13" strokeWidth="1" />
    </svg>
  );
}
function IconLips() {
  return (
    <svg viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-10">
      <path d="M4 11 C9 3 16 2 22 6 C28 2 35 3 40 11 C35 20 28 21 22 17 C16 21 9 20 4 11Z" />
      <path d="M11 11 C15 7 22 7 22 11" strokeWidth="1.1" />
    </svg>
  );
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  faceShape: <IconFace />,
  eyebrows:  <IconEyebrow />,
  eyes:      <IconEye />,
  cheeks:    <IconCheeks />,
  nose:      <IconNose />,
  lips:      <IconLips />,
};

function FeatureBox({ featureKey, title, subtitle, notes }: { featureKey: string; title: string; subtitle: string; notes: string }) {
  const bullets = notes.split(/[.;,]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: "#F0E8DC", color: "#9C7D5B" }}>
          {FEATURE_ICONS[featureKey] ?? <IconFace />}
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold leading-tight" style={{ color: "#3D2B1F" }}>{title}</p>
          <p className="text-[15px] font-medium leading-tight mt-0.5" style={{ color: "#6B5344" }}>{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-1.5 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: "#6B5344" }}>
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#C8A96E" }} />{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PointerLines() {
  const lines: [number, number, number, number][] = [
    [29, 100, 0, 100],
    [36,  46, 0,  46],
    [50,  67, 0,  72],
    [62,  36, 100, 36],
    [71,  60, 100, 60],
    [57,  79, 100, 79],
  ];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid meet">
      {lines.map(([dx, dy, lx, ly], i) => (
        <g key={i}>
          <line x1={dx} y1={dy} x2={lx} y2={ly} stroke="white" strokeWidth="0.65" opacity="0.88" />
          <circle cx={dx} cy={dy} r="1.8" fill="white" opacity="0.95" />
        </g>
      ))}
    </svg>
  );
}

interface Props {
  faceShape: FaceShapeResult;
  features: FeatureBreakdown;
  blendedConfidence?: number;
  photoUrl?: string;
}

export function FaceFeaturesCard({ faceShape, features, blendedConfidence, photoUrl }: Props) {
  const displayConfidence = blendedConfidence ?? faceShape.confidence;
  const eyebrowSubtitle = "Natural Arch";
  const eyebrowNotes    = "Soft natural arch. Medium thickness. Well-groomed shape";
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "#F9F5F0", border: "1px solid #E8DDD0" }}>
      <div className="text-center pt-10 pb-5 px-6" style={{ background: "#F9F5F0" }}>
        <div className="flex items-center justify-center gap-3">
          <span style={{ color: "#C8A96E", fontSize: 18 }}>&#10022;</span>
          <h2 className="text-4xl font-serif" style={{ color: "#3D2B1F", letterSpacing: "-0.01em" }}>Face Features Analysis</h2>
          <span style={{ color: "#C8A96E", fontSize: 18 }}>&#10022;</span>
        </div>
        <div className="mt-3 h-px mx-auto w-20" style={{ background: "#E8DDD0" }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 px-8 pb-10 items-center" style={{ background: "#F9F5F0" }}>
        <div className="flex flex-col gap-4">
          <FeatureBox featureKey="faceShape" title="Face Shape" subtitle={faceShape.shape} notes={faceShape.traits.join(". ")} />
          <FeatureBox featureKey="eyes" title="Eyes" subtitle={features.eyes?.shape ?? "Almond Eyes"} notes={features.eyes?.notes ?? "Almond-shaped. Medium size. Warm, slightly upturned"} />
          <FeatureBox featureKey="nose" title="Nose" subtitle={features.nose?.shape ?? "Straight & Soft"} notes={features.nose?.notes ?? "Straight bridge. Rounded tip. Proportional to face"} />
        </div>
        <div className="relative mx-auto shrink-0 rounded-2xl overflow-hidden" style={{ width: "clamp(240px,28vw,340px)", aspectRatio: "3/4", background: "#EDE3D8", boxShadow: "0 8px 36px rgba(61,43,31,0.14)" }}>
          {photoUrl ? (
            <Image src={photoUrl} alt="Face features" fill unoptimized className="object-cover" style={{ objectPosition: "top center" }} />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#DFD0BE,#C8B09A)" }} />
          )}
          <PointerLines />
        </div>
        <div className="flex flex-col gap-4">
          <FeatureBox featureKey="eyebrows" title="Eyebrows" subtitle={eyebrowSubtitle} notes={eyebrowNotes} />
          <FeatureBox featureKey="cheeks" title="Cheeks" subtitle={features.cheeks?.shape ?? "Soft & Balanced"} notes={features.cheeks?.notes ?? "Gently full. Subtle cheekbones. Balanced facial thirds"} />
          <FeatureBox featureKey="lips" title="Lips" subtitle={features.lips?.shape ?? "Full & Natural"} notes={features.lips?.notes ?? "Medium fullness. Defined Cupid's bow. Naturally pink"} />
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 px-6 py-4" style={{ borderTop: "1px solid #E8DDD0", background: "#F5EFE7" }}>
        <ConfidenceBadge confidence={displayConfidence} />
      </div>
    </div>
  );
}