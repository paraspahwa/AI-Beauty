import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FaceShapeResult, FeatureBreakdown } from "@/types/report";

interface Props {
  faceShape: FaceShapeResult;
  features: FeatureBreakdown;
  blendedConfidence?: number;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  if (pct >= 80) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(123,210,158,0.15)", color: "#6ECF9B", border: "1px solid rgba(110,207,155,0.25)" }}>
        High confidence · {pct}%
      </span>
    );
  }
  if (pct >= 65) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(201,149,107,0.15)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.25)" }}>
        Good confidence · {pct}%
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}>
      Low confidence · {pct}% — shape advice is generalised
    </span>
  );
}

export function FaceFeaturesCard({ faceShape, features, blendedConfidence }: Props) {
  const displayConfidence = blendedConfidence ?? faceShape.confidence;
  const items: { key: keyof FeatureBreakdown; label: string }[] = [
    { key: "eyes",   label: "Eyes" },
    { key: "nose",   label: "Nose" },
    { key: "lips",   label: "Lips" },
    { key: "cheeks", label: "Cheeks" },
  ];

  return (
    <Card className="p-2">
      <CardHeader>
        <p className="text-xs uppercase tracking-widest text-ink-mist">Your face shape</p>
        <CardTitle>{faceShape.shape}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-1.5">
          {faceShape.traits.map((trait) => (
            <li key={trait} className="flex items-start gap-2 text-sm text-ink-stone">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              {trait}
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(({ key, label }) => (
            <div key={key} className="rounded-2xl bg-cream-100 border border-cream-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-lg text-ink">{label}</h4>
                <Badge tone="accent">{features[key]?.shape ?? "—"}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink-stone leading-relaxed">{features[key]?.notes ?? ""}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-stone">
          <ConfidenceBadge confidence={displayConfidence} />
        </p>
      </CardContent>
    </Card>
  );
}
