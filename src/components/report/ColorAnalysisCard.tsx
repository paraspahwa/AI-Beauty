import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ColorAnalysisResult } from "@/types/report";

export function ColorAnalysisCard({ data }: { data: ColorAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-muted">Color Season</p>
            <CardTitle>{data.season}</CardTitle>
          </div>
          <Badge tone="accent">{data.undertone} undertone</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-ink-soft leading-relaxed">{data.description}</p>

        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Your palette</h4>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {data.palette.map((c) => (
              <div key={c.hex} className="flex flex-col items-center gap-1.5">
                <span
                  className="h-12 w-12 rounded-full border border-white shadow-card"
                  style={{ backgroundColor: c.hex }}
                  aria-label={c.name}
                  title={`${c.name} ${c.hex}`}
                />
                <span className="text-[10px] text-ink-muted text-center leading-tight">{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Best metals</h4>
          <div className="flex flex-wrap gap-2">
            {data.metals.map((m) => (
              <Badge key={m} tone="default">{m}</Badge>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Colors to avoid</h4>
          <div className="flex flex-wrap gap-3">
            {data.avoidColors.map((c) => (
              <div key={c.hex} className="flex items-center gap-2 text-xs text-ink-soft">
                <span
                  className="h-6 w-6 rounded-full border border-white shadow-card"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
