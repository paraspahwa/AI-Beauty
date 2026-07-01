import Link from "next/link";
import { Sparkles } from "lucide-react";

const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Report", href: "/#samples" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Get started", href: "/upload" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-terracotta/15 bg-[var(--color-surface)]">
      <div className="container flex max-w-6xl flex-col gap-8 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso">
              <Sparkles className="h-4 w-4 text-[var(--btn-fg)]" />
            </div>
            <span className="font-display text-lg text-ink transition-opacity group-hover:opacity-80">
              Renovaara
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-ink-stone">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-terracotta">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-terracotta/10 pt-6 sm:flex-row">
          <nav className="flex items-center gap-5 text-xs text-ink-mist">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-terracotta">
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-ink-mist">
            © {new Date().getFullYear()} Renovaara · Crafted with care
          </p>
        </div>
      </div>
    </footer>
  );
}
