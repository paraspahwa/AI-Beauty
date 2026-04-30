import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Glasses, Scale, Eye } from "lucide-react";
import type { GlassesResult } from "@/types/report";

const GOAL_ICONS = [Scale, Glasses, Eye];

export function SpectaclesCard({ data }: { data: GlassesResult }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-widest text-ink-mist">Spectacles Guide</p>
        <CardTitle>Find frames that flatter you</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="grid gap-3 sm:grid-cols-3">
          {data.goals.map((g, i) => {
            const Icon = GOAL_ICONS[i % GOAL_ICONS.length];
            return (
              <div key={g} className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-obsidian shadow-glow" style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)" }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-ink">{g}</span>
              </div>
            );
          })}
        </section>

        <section>
          <h4 className="mb-4 text-center font-serif text-xl text-ink divider-stars">Try-On: Flattering Styles</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {data.recommended.map((r) => (
              <div key={r.style} className="rounded-2xl p-3 text-center" style={{ background: "rgba(26,26,38,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[11px] uppercase tracking-widest text-ink-stone">{r.style}</p>
                <p className="mt-2 text-xs text-ink-mist leading-snug">{r.reason}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cream-200 bg-cream-100 p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
              <Check className="h-4 w-4" /> Good choices
            </p>
            <ul className="space-y-2 text-sm text-ink-stone">
              {data.recommended.map((r, i) => (
                <li key={`rec-list-${i}`} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  <span><span className="font-medium text-ink">{r.style}</span> — {r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-cream-200 bg-cream-100 p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-danger">
              <X className="h-4 w-4" /> Avoid these
            </p>
            <ul className="space-y-2 text-sm text-ink-stone">
              {data.avoid.map((r) => (
                <li key={r.style} className="flex items-start gap-2">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                  <span><span className="font-medium text-ink">{r.style}</span> — {r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cream-200 bg-cream-100 p-5">
            <h5 className="mb-3 text-xs uppercase tracking-widest text-ink-stone">Best colors &amp; finishes</h5>
            <div className="flex flex-wrap items-end gap-4">
              {data.colors.map((c) => (
                <div key={c.hex} className="flex flex-col items-center gap-1.5">
                  <span className="h-10 w-10 rounded-full border border-white shadow-card" style={{ backgroundColor: c.hex }} />
                  <span className="text-[11px] text-ink-stone">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-cream-200 bg-cream-100 p-5">
            <h5 className="mb-3 text-xs uppercase tracking-widest text-ink-stone">Fit &amp; quick tips</h5>
            <ul className="space-y-2 text-sm text-ink-stone">
              {data.fitTips.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
