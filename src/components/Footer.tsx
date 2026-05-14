import Link from "next/link";
import { Sparkles } from "lucide-react";

const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Get started", href: "/upload" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy", href: "/refund" },
];

export function Footer() {
  return (
    <footer
      className="mt-24 border-t"
      style={{ borderColor: "rgba(190,24,93,0.18)", background: "rgba(255,247,251,0.9)" }}
    >
      <div className="container max-w-6xl py-10 flex flex-col gap-8">
        {/* Top row — brand + nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, #EC4899, #8B5CF6)" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-serif text-lg text-ink group-hover:text-terracotta transition-colors">
              Renovaara
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm text-ink-stone">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-terracotta transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row — legal links + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-terracotta/20 pt-6">
          <nav className="flex items-center gap-5 text-xs text-ink-mist">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-terracotta transition-colors">
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
