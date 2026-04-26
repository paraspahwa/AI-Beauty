import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FaceShapeResult, FeatureBreakdown } from "@/types/report";

interface Props {
  faceShape: FaceShapeResult;
  features: FeatureBreakdown;
}

export function FaceFeaturesCard({ faceShape, features }: Props) {
  const items: { key: keyof FeatureBreakdown; label: string }[] = [
    { key: "eyes",   label: "Eyes" },
    { key: "nose",   label: "Nose" },
    { key: "lips",   label: "Lips" },
    { key: "cheeks", label: "Cheeks" },
  ];

  return (
    <Card className="p-2">
      <CardHeader>
        <p className="text-xs uppercase tracking-widest text-ink-muted">Your face shape</p>
        <CardTitle>{faceShape.shape}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-1.5">
          {faceShape.traits.map((trait) => (
            <li key={trait} className="flex items-start gap-2 text-sm text-ink-soft">
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
                <Badge tone="accent">{features[key].shape}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">{features[key].notes}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-muted">
          Confidence: {(faceShape.confidence * 100).toFixed(0)}%
        </p>
      </CardContent>
    </Card>
  );
}
