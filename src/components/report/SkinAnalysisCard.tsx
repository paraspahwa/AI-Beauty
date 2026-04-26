import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SkinAnalysisResult } from "@/types/report";

export function SkinAnalysisCard({ data }: { data: SkinAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-widest text-ink-muted">Skin Analysis</p>
        <div className="flex items-center gap-3">
          <CardTitle>{data.type}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {data.concerns.slice(0, 3).map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Zone observations</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.zones.map((z) => (
              <div key={z.zone} className="rounded-2xl border border-cream-200 bg-cream-100 p-4">
                <p className="font-serif text-base text-ink">{z.zone}</p>
                <p className="mt-1 text-sm text-ink-muted">{z.observation}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Recommended routine</h4>
          <ol className="space-y-2.5">
            {data.routine.map((r, i) => (
              <li key={r.step} className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent-deep">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-ink">{r.step}</span>
                  <span className="text-ink-muted"> — {r.product}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </CardContent>
    </Card>
  );
}
