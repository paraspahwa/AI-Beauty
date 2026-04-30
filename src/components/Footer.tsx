import Link from "next/link";
import { Sparkles } from "lucide-react";

const FOOTER_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Get started", href: "/upload" },
];

export function Footer() {
  return (
    <footer
      className="mt-24 border-t"
      style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(10,10,15,0.6)" }}
    >
      <div className="container max-w-6xl py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-obsidian" />
          </div>
          <span className="font-serif text-lg text-ink group-hover:text-chrome transition-colors">
            StyleAI
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm text-ink-stone">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-ink-mist">
          © {new Date().getFullYear()} StyleAI · Crafted with care
        </p>
      </div>
    </footer>
  );
}
