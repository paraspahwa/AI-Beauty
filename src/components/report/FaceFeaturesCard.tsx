"use client";

import Image from "next/image";
import type { FaceShapeResult, FeatureBreakdown, FaceLandmarks } from "@/types/report";

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct    = Math.round(confidence * 100);
  const bg     = pct >= 80 ? "rgba(123,210,158,0.12)" : pct >= 65 ? "rgba(201,149,107,0.12)" : "rgba(248,113,113,0.10)";
  const color  = pct >= 80 ? "#5AB882"                 : pct >= 65 ? "#C9956B"                : "#F87171";
  const border = pct >= 80 ? "rgba(90,184,130,0.30)"   : pct >= 65 ? "rgba(201,149,107,0.30)" : "rgba(248,113,113,0.30)";
  const label  = pct >= 80 ? "High confidence"         : pct >= 65 ? "Good confidence"        : "Low confidence";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[13px] px-5 py-2 rounded-full font-medium"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {label} · {pct}%
    </span>
  );
}

// ── Icons — thin, elegant line art exactly matching reference ─────────────────
function IconFace() {
  return (
    <svg viewBox="0 0 36 44" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-9 w-8">
      <ellipse cx="18" cy="25" rx="13" ry="17" />
      <path d="M11 20 Q18 17 25 20" strokeLinecap="round" />
      <ellipse cx="13" cy="24" rx="2.2" ry="1.6" />
      <ellipse cx="23" cy="24" rx="2.2" ry="1.6" />
      <path d="M13 32 Q18 36 23 32" strokeLinecap="round" />
    </svg>
  );
}
function IconEyebrow() {
  return (
    <svg viewBox="0 0 44 16" fill="none" stroke="currentColor" strokeWidth="2.0" className="h-5 w-10">
      <path d="M3 13 C8 4 20 2 32 5 C38 7 42 11 42 13" strokeLinecap="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-6 w-10">
      <path d="M2 11 C9 2 35 2 42 11 C35 20 9 20 2 11Z" />
      <circle cx="22" cy="11" r="4.5" />
      <circle cx="22" cy="11" r="2" fill="currentColor" />
    </svg>
  );
}
function IconNose() {
  return (
    <svg viewBox="0 0 28 40" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-9 w-7">
      <path d="M14 4 L14 26" strokeLinecap="round" />
      <path d="M14 26 C11 29 5 31 5 35 C5 38 9 39 14 39 C19 39 23 38 23 35 C23 31 17 29 14 26Z" />
    </svg>
  );
}
function IconCheeks() {
  return (
    <svg viewBox="0 0 48 26" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-6 w-11">
      <ellipse cx="11" cy="13" rx="8.5" ry="6.5" strokeDasharray="2 1.5" />
      <ellipse cx="37" cy="13" rx="8.5" ry="6.5" strokeDasharray="2 1.5" />
    </svg>
  );
}
function IconLips() {
  return (
    <svg viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-6 w-10">
      <path d="M4 12 C8 4 16 2 22 7 C28 2 36 4 40 12 C36 22 28 23 22 18 C16 23 8 22 4 12Z" />
      <path d="M10 12 C14 8 22 8 22 12" strokeWidth="1.0" />
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

// ── Feature box ───────────────────────────────────────────────────────────────
function FeatureBox({
  featureKey,
  title,
  subtitle,
  notes,
}: {
  featureKey: string;
  title: string;
  subtitle: string;
  notes: string;
}) {
  // Split on period or semicolon — commas inside notes stay intact
  const bullets = notes
    .split(/[.;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2.5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(200,185,168,0.35)",
        boxShadow: "0 1px 4px rgba(61,43,31,0.04)",
      }}
    >
      {/* Icon + label row */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: "#F2EAE0", color: "#9C7D5B" }}
        >
          {FEATURE_ICONS[featureKey] ?? <IconFace />}
        </span>
        <div>
          {/* ALL CAPS label — small, tracked */}
          <p
            className="text-[10.5px] uppercase tracking-[0.20em] font-bold leading-none"
            style={{ color: "#5C3D2E" }}
          >
            {title}
          </p>
          {/* Subtitle — large regular-weight serif */}
          <p
            className="text-[18px] font-normal leading-snug mt-[3px]"
            style={{ color: "#2C1A10", fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Bullet list */}
      <ul className="space-y-[5px] pl-0.5">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px] leading-snug"
            style={{ color: "#3D2B1F" }}
          >
            <span
              className="mt-[6px] shrink-0 rounded-full"
              style={{ height: 5, width: 5, background: "#3D2B1F" }}
            />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Pointer lines ─────────────────────────────────────────────────────────────
// ViewBox: 0 0 100 133  (3:4 aspect ratio, preserveAspectRatio="none" so
// x=0 is exact left photo edge, x=100 exact right, y=0 top, y=133 bottom).
//
// Rekognition landmark X/Y are 0-1 fractions of the original image.
// objectPosition "center 10%" shifts the photo slightly downward in the
// container, so we subtract a small Y offset (≈5%) before mapping to SVG.
//
// Conversion: svgX = landmarkX * 100
//             svgY = (landmarkY - Y_CROP_OFFSET) * 133 / (1 - Y_CROP_OFFSET)
//
// The photo container uses objectPosition "center 10%" which means the top
// 10% of the image is clipped. We compensate so dots land on the right pixel.

const Y_CROP_OFFSET = 0.05; // matches objectPosition "center 10%" ÷ 2

// Hardcoded fallback when Rekognition landmarks unavailable
const FALLBACK_DOTS = {
  faceShape: { x: 0.28, y: 0.25 },
  eyes:      { x: 0.37, y: 0.42 },
  nose:      { x: 0.50, y: 0.58 },
  eyebrows:  { x: 0.65, y: 0.28 },
  cheeks:    { x: 0.70, y: 0.52 },
  lips:      { x: 0.62, y: 0.70 },
} satisfies FaceLandmarks;

function toSvg(pt: { x: number; y: number }): { svgX: number; svgY: number } {
  const svgX = pt.x * 100;
  const rawY  = Math.max(0, pt.y - Y_CROP_OFFSET);
  const svgY  = (rawY / (1 - Y_CROP_OFFSET)) * 133;
  return { svgX, svgY };
}

interface PointerLinesProps {
  landmarks?: FaceLandmarks;
}

function PointerLines({ landmarks }: PointerLinesProps) {
  const dots = landmarks ?? FALLBACK_DOTS;

  // Each entry: [dot point, exit X (0=left edge, 100=right edge), exit Y]
  // Left panel exits go to x=0; right panel exits go to x=100.
  // exitY is proportional to where the corresponding feature box sits in the
  // 3-row panel (top≈20%, mid≈50%, bottom≈80% of photo height).
  const entries: Array<{ dot: { x: number; y: number }; exitX: number; exitY: number }> = [
    { dot: dots.faceShape, exitX:   0, exitY: 20  },  // → Face Shape  (top-left box)
    { dot: dots.eyes,      exitX:   0, exitY: 50  },  // → Eyes        (mid-left box)
    { dot: dots.nose,      exitX:   0, exitY: 80  },  // → Nose        (bot-left box)
    { dot: dots.eyebrows,  exitX: 100, exitY: 20  },  // → Eyebrows    (top-right box)
    { dot: dots.cheeks,    exitX: 100, exitY: 50  },  // → Cheeks      (mid-right box)
    { dot: dots.lips,      exitX: 100, exitY: 80  },  // → Lips        (bot-right box)
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 133"
      preserveAspectRatio="none"
    >
      {entries.map(({ dot, exitX, exitY }, i) => {
        const { svgX, svgY } = toSvg(dot);
        return (
          <g key={i}>
            <line
              x1={svgX} y1={svgY}
              x2={exitX} y2={exitY}
              stroke="white"
              strokeWidth="0.6"
              opacity="0.92"
            />
            <circle cx={svgX} cy={svgY} r="1.5" fill="white" opacity="1" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  faceShape: FaceShapeResult;
  features: FeatureBreakdown;
  blendedConfidence?: number;
  photoUrl?: string;
  faceLandmarks?: FaceLandmarks;
}

export function FaceFeaturesCard({ faceShape, features, blendedConfidence, photoUrl, faceLandmarks }: Props) {
  const displayConfidence = blendedConfidence ?? faceShape.confidence;

  return (
    <div
      className="rounded-3xl"
      style={{ background: "#F7F2EC" }}
    >
      {/* ── Title section ────────────────────────────────────────────────────── */}
      <div className="text-center pt-10 pb-4 px-6">
        <div className="flex items-center justify-center gap-4">
          <span style={{ color: "#C8A96E", fontSize: 20, lineHeight: 1 }}>&#10022;</span>
          <h2
            className="text-[46px] leading-tight"
            style={{
              color: "#2C1A10",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontWeight: 400,
              letterSpacing: "-0.01em",
            }}
          >
            Face Features Analysis
          </h2>
          <span style={{ color: "#C8A96E", fontSize: 20, lineHeight: 1 }}>&#10022;</span>
        </div>

        {/* Divider: line · dot · line */}
        <div className="flex items-center justify-center mt-4 gap-3">
          <div className="h-px flex-1 max-w-[80px]" style={{ background: "#D9CFC4" }} />
          <div className="h-[5px] w-[5px] rounded-full" style={{ background: "#C8A96E" }} />
          <div className="h-px flex-1 max-w-[80px]" style={{ background: "#D9CFC4" }} />
        </div>
      </div>

      {/* ── 3-column body ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 px-10 pb-10 items-center">

        {/* Left column: Face Shape · Eyes · Nose */}
        <div className="flex flex-col gap-4">
          <FeatureBox
            featureKey="faceShape"
            title="Face Shape"
            subtitle={faceShape.shape}
            notes={faceShape.traits.join(". ")}
          />
          <FeatureBox
            featureKey="eyes"
            title="Eyes"
            subtitle={features.eyes?.shape ?? "Almond Eyes"}
            notes={features.eyes?.notes ?? "Almond-shaped. Medium size. Warm, slightly upturned"}
          />
          <FeatureBox
            featureKey="nose"
            title="Nose"
            subtitle={features.nose?.shape ?? "Straight & Soft"}
            notes={features.nose?.notes ?? "Straight bridge. Rounded tip. Proportional to face"}
          />
        </div>

        {/* Center: Portrait photo + pointer lines */}
        <div
          className="relative mx-auto shrink-0 rounded-2xl overflow-hidden"
          style={{
            width: "clamp(260px, 30vw, 380px)",
            aspectRatio: "3/4",
            boxShadow: "0 6px 32px rgba(61,43,31,0.18)",
          }}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Face features analysis"
              fill
              unoptimized
              className="object-cover"
              style={{ objectPosition: "center 10%" }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(160deg,#DFD0BE,#C8B09A)" }}
            />
          )}
          <PointerLines landmarks={faceLandmarks} />
        </div>

        {/* Right column: Eyebrows · Cheeks · Lips */}
        <div className="flex flex-col gap-4">
          <FeatureBox
            featureKey="eyebrows"
            title="Eyebrows"
            subtitle={features.eyebrows?.shape ?? "Natural Arch"}
            notes={features.eyebrows?.notes ?? "Soft natural arch. Medium thickness. Well-groomed shape"}
          />
          <FeatureBox
            featureKey="cheeks"
            title="Cheeks"
            subtitle={features.cheeks?.shape ?? "Soft & Balanced"}
            notes={features.cheeks?.notes ?? "Gently full. Subtle cheekbones. Balanced facial thirds"}
          />
          <FeatureBox
            featureKey="lips"
            title="Lips"
            subtitle={features.lips?.shape ?? "Full & Natural"}
            notes={features.lips?.notes ?? "Medium fullness. Defined Cupid's bow. Naturally pink"}
          />
        </div>
      </div>

      {/* ── Confidence footer ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center px-6 py-5"
        style={{ borderTop: "1px solid #E4D8CC" }}
      >
        <ConfidenceBadge confidence={displayConfidence} />
      </div>
    </div>
  );
}
