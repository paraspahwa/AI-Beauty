import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import type { HairstyleResult } from "@/types/report";

export function HairstyleCard({ data }: { data: HairstyleResult }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-widest text-ink-stone">Hairstyle Guide</p>
        <CardTitle>Cuts &amp; colors made for you</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-stone">Recommended styles</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.styles.map((s) => (
              <div key={s.name} className="rounded-2xl border border-cream-200 bg-cream-100 p-4">
                <p className="font-serif text-lg text-ink">{s.name}</p>
                <p className="mt-1 text-sm text-ink-stone leading-snug">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-stone">Length guide</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.lengths.map((l) => (
              <div key={l.name} className="rounded-2xl p-4 text-center" style={{ background: "rgba(26,26,38,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="font-serif text-base text-ink">{l.name}</p>
                <p className="mt-1 text-xs text-ink-stone">{l.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-stone">Color suggestions</h4>
          <div className="flex flex-wrap gap-4">
            {data.colors.map((c) => (
              <div key={c.hex} className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-3 pr-4">
                <span
                  className="h-10 w-10 rounded-full border border-white shadow-card"
                  style={{ backgroundColor: c.hex }}
                />
                <div>
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-stone">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-cream-200 bg-cream-100 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-danger">
            <X className="h-4 w-4" /> Best to avoid
          </p>
          <ul className="space-y-1.5 text-sm text-ink-stone">
            {data.avoid.map((a) => (
              <li key={a} className="flex items-start gap-2">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> {a}
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
