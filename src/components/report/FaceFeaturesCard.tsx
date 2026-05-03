"use client";

import Image from "next/image";
import type { FaceShapeResult, FeatureBreakdown } from "@/types/report";

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const bg = pct >= 80 ? "rgba(123,210,158,0.15)" : pct >= 65 ? "rgba(201,149,107,0.15)" : "rgba(248,113,113,0.12)";
  const color = pct >= 80 ? "#6ECF9B" : pct >= 65 ? "#C9956B" : "#F87171";
  const border = pct >= 80 ? "rgba(110,207,155,0.25)" : pct >= 65 ? "rgba(201,149,107,0.25)" : "rgba(248,113,113,0.25)";
  const label = pct >= 80 ? "High confidence" : pct >= 65 ? "Good confidence" : "Low confidence";
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: bg, color, border: `1px solid ${border}` }}>
      {label} · {pct}%
    </span>
  );
}

function IconFace() {
  return (
    <svg viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-8 w-7">
      <ellipse cx="16" cy="20" rx="13" ry="17" />
      <path d="M10 16 Q16 13 22 16" strokeLinecap="round" />
      <ellipse cx="11" cy="20" rx="2.5" ry="1.8" />
      <ellipse cx="21" cy="20" rx="2.5" ry="1.8" />
      <path d="M12 27 Q16 30 20 27" strokeLinecap="round" />
    </svg>
  );
}
function IconEyebrow() {
  return (
    <svg viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-9">
      <path d="M4 14 C8 6 16 4 28 7 C34 9 38 12 38 14" strokeLinecap="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 36 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-8">
      <path d="M2 10 C8 2 28 2 34 10 C28 18 8 18 2 10Z" />
      <circle cx="18" cy="10" r="4" />
      <circle cx="18" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconNose() {
  return (
    <svg viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-8 w-6">
      <path d="M12 4 L12 20" strokeLinecap="round" />
      <path d="M12 20 C10 22 6 24 6 27 C6 29 8 30 12 30 C16 30 18 29 18 27 C18 24 14 22 12 20Z" />
    </svg>
  );
}
function IconCheeks() {
  return (
    <svg viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-6 w-9">
      <ellipse cx="10" cy="12" rx="8" ry="6" strokeDasharray="2 1.5" />
      <ellipse cx="30" cy="12" rx="8" ry="6" strokeDasharray="2 1.5" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}
function IconLips() {
  return (
    <svg viewBox="0 0 36 18" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-5 w-8">
      <path d="M4 9 C8 3 14 2 18 5 C22 2 28 3 32 9 C28 16 22 17 18 14 C14 17 8 16 4 9Z" />
      <path d="M10 9 C13 6 18 6 18 9" strokeWidth="1" />
    </svg>
  );
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  faceShape: <IconFace />,
  eyebrows: <IconEyebrow />,
  eyes: <IconEye />,
  cheeks: <IconCheeks />,
  nose: <IconNose />,
  lips: <IconLips />,
};

function FeatureBox({ featureKey, title, subtitle, notes }: { featureKey: string; title: string; subtitle: string; notes: string }) {
  const bullets = notes.split(/[,;.]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "#F0E8DC", color: "#9C7D5B" }}>
          {FEATURE_ICONS[featureKey] ?? <IconFace />}
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold" style={{ color: "#3D2B1F" }}>{title}</p>
          <p className="text-sm font-medium" style={{ color: "#6B5344" }}>{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#C8A96E" }} />{b}
          </li>
        ))}
      </ul>
    </div>
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
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
      <div className="text-center pt-8 pb-5 px-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center justify-center gap-3">
          <span style={{ color: "#C8A96E", fontSize: 16 }}>&#10022;</span>
          <h2 className="text-3xl font-serif" style={{ color: "#3D2B1F" }}>Face Features Analysis</h2>
          <span style={{ color: "#C8A96E", fontSize: 16 }}>&#10022;</span>
        </div>
        <div className="mt-2 h-px mx-auto w-16" style={{ background: "#E8DDD0" }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0 p-6 items-start">
        <div className="flex flex-col gap-4 md:pr-5">
          <FeatureBox featureKey="faceShape" title="Face Shape" subtitle={faceShape.shape} notes={faceShape.traits.join(". ")} />
          <FeatureBox featureKey="eyes" title="Eyes" subtitle={features.eyes?.shape ?? "—"} notes={features.eyes?.notes ?? ""} />
          <FeatureBox featureKey="nose" title="Nose" subtitle={features.nose?.shape ?? "—"} notes={features.nose?.notes ?? ""} />
        </div>

        <div className="relative mx-4 my-2 rounded-2xl overflow-hidden shrink-0" style={{ width: "clamp(200px,26vw,300px)", aspectRatio: "3/4", background: "#EDE3D8" }}>
          {photoUrl && <Image src={photoUrl} alt="Face features" fill unoptimized className="object-cover object-center" />}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid meet">
            <line x1="30" y1="22" x2="5" y2="22" stroke="white" strokeWidth="0.7" opacity="0.85" />
            <circle cx="30" cy="22" r="1.4" fill="white" opacity="0.9" />
            <line x1="28" y1="55" x2="5" y2="55" stroke="white" strokeWidth="0.7" opacity="0.85" />
            <circle cx="28" cy="55" r="1.4" fill="white" opacity="0.9" />
            <line x1="38" y1="80" x2="5" y2="90" stroke="white" strokeWidth="0.7" opacity="0.85" />
            <circle cx="38" cy="80" r="1.4" fill="white" opacity="0.9" />
            <line x1="60" y1="22" x2="95" y2="18" stroke="white" strokeWidth="0.7" opacity="0.85" />
            <circle cx="60" cy="22" r="1.4" fill="white" opacity="0.9" />
            <line x1="70" y1="58" x2="95" y2="55" stroke="white" strokeWidth="0.7" opacity="0.85" />
            <circle cx="70" cy="58" r="1.4" fill="white" opacity="0.9" />
            <line x1="50" y1="95" x2="95" y2="95" stroke="white" strokeWidth="0.7" opacity="0.85" />
            <circle cx="50" cy="95" r="1.4" fill="white" opacity="0.9" />
          </svg>
        </div>

        <div className="flex flex-col gap-4 md:pl-5">
          <FeatureBox featureKey="eyebrows" title="Eyebrows" subtitle="Natural Arch" notes="Soft natural arch. Medium thickness. Well-groomed shape" />
          <FeatureBox featureKey="cheeks" title="Cheeks" subtitle={features.cheeks?.shape ?? "Soft & Balanced"} notes={features.cheeks?.notes ?? "Gently full. Subtle cheekbones. Balanced facial thirds"} />
          <FeatureBox featureKey="lips" title="Lips" subtitle={features.lips?.shape ?? "Full & Natural"} notes={features.lips?.notes ?? "Medium fullness. Defined Cupids bow. Naturally pink"} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-6 py-4" style={{ borderTop: "1px solid #E8DDD0", background: "#F5EFE7" }}>
        <ConfidenceBadge confidence={displayConfidence} />
      </div>
    </div>
  );
}
