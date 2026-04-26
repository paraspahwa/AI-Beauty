import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Camera, Palette, Glasses, Scissors, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="container max-w-5xl pt-16 pb-12 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs uppercase tracking-widest text-accent-deep">
          <Sparkles className="h-3.5 w-3.5" /> AI Personal Stylist
        </span>
        <h1 className="mt-6 text-5xl text-ink sm:text-6xl">
          Discover the styles<br /> that <em className="text-accent-deep">flatter you</em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-soft leading-relaxed">
          Upload a selfie. StyleAI analyzes your face shape, color season, skin, and
          recommends spectacles and hairstyles tailored just for you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="accent">
            <Link href="/upload"><Camera className="h-4 w-4" /> Upload your selfie</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#how">How it works</Link>
          </Button>
        </div>
      </section>

      {/* Feature grid */}
      <section id="how" className="container max-w-5xl py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Palette,  title: "Color season",  body: "12-season analysis with a custom palette and metals." },
            { icon: Sparkles, title: "Face shape",    body: "Identify your shape and your most flattering features." },
            { icon: Glasses,  title: "Spectacles",    body: "Frame styles, fit guide, and best colors." },
            { icon: Scissors, title: "Hairstyle",     body: "Cuts, lengths, and colors made for your face." },
          ].map((f) => (
            <div key={f.title} className="card-soft text-center">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent-deep">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-serif text-xl text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container max-w-3xl py-16">
        <h2 className="text-center text-3xl text-ink sm:text-4xl">Simple, honest pricing</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card-soft">
            <p className="text-xs uppercase tracking-widest text-ink-muted">Free preview</p>
            <p className="mt-2 font-serif text-4xl text-ink">$0</p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              <li>• Color season + palette</li>
              <li>• Face shape</li>
              <li>• Personalized intro</li>
            </ul>
          </div>
          <div className="card-soft border-accent/40 bg-white">
            <p className="text-xs uppercase tracking-widest text-accent-deep">Full report</p>
            <p className="mt-2 font-serif text-4xl text-ink">$9.99</p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              <li>• Skin analysis &amp; routine</li>
              <li>• Spectacles guide</li>
              <li>• Hairstyle recommendations</li>
              <li>• Downloadable PDF</li>
              <li>• Shareable cards</li>
            </ul>
            <Button asChild variant="accent" className="mt-5 w-full">
              <Link href="/upload">Get my full report</Link>
            </Button>
          </div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <ShieldCheck className="h-3.5 w-3.5" /> Your selfie stays private — only you can view your report.
        </p>
      </section>

      <footer className="container max-w-5xl py-8 text-center text-xs text-ink-muted">
        © {new Date().getFullYear()} StyleAI · Crafted with care
      </footer>
    </main>
  );
}
