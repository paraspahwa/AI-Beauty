import Link from "next/link";
import Image from "next/image";
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
          <Link href="/" className="flex items-center group">
            <Image
              src="/1779024315.png"
              alt="Renovaara"
              width={180}
              height={101}
              className="h-10 w-auto transition-opacity group-hover:opacity-80"
            />
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
