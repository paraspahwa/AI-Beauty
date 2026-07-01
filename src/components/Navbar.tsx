"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, Camera, LayoutDashboard, LogOut, ChevronDown, Moon, Sun, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { PRODUCT_COPY } from "@/lib/product-copy";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#samples", label: "Report" },
  { href: "/#features", label: "Chapters" },
  { href: "/#pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [dashOpen, setDashOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const dashRef = React.useRef<HTMLDivElement>(null);
  const isHome = pathname === "/";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => { setMenuOpen(false); setDashOpen(false); }, [pathname]);

  // Sync auth state
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const stored = (localStorage.getItem("renovaara_theme") as "light" | "dark" | null) ?? "light";
    setTheme(stored);
    root.classList.toggle("dark", stored === "dark");
  }, []);

  // Close dashboard dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dashRef.current && !dashRef.current.contains(e.target as Node)) {
        setDashOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("dark", "light");
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    }
    localStorage.setItem("renovaara_theme", next);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled || !isHome
          ? "border-b border-terracotta/15 bg-[var(--parchment)]/90 shadow-sm backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      {/* Shimmer border line — appears on scroll */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500",
          scrolled || !isHome ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "var(--color-border)" }}
      />
      <div className="container max-w-6xl flex h-16 items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <motion.div
            whileHover={{ rotate: 20, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--btn-bg)]"
          >
            <Sparkles className="h-4 w-4 text-[var(--btn-fg)]" />
          </motion.div>
          <span className="font-display font-semibold text-lg text-ink group-hover:opacity-80 transition-opacity duration-200">
            Renovaara
          </span>
        </Link>

        {/* Desktop nav links */}
        {isHome && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm text-ink-stone hover:text-ink transition-colors rounded-full hover:bg-[var(--surface-hover)] group"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side CTA */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          {user ? (
            <>
              {/* Dashboard dropdown */}
              <div ref={dashRef} className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDashOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={dashOpen}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                  <ChevronDown className={`h-3 w-3 ml-1 transition-transform duration-200 ${dashOpen ? "rotate-180" : ""}`} />
                </Button>
                {dashOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg py-1 z-50">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-ink-stone hover:bg-[var(--surface-hover)] hover:text-ink transition-colors" onClick={() => setDashOpen(false)}>
                      <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                    </Link>
                    <Link href="/vault" className="flex items-center gap-2 px-4 py-2 text-sm text-ink-stone hover:bg-[var(--surface-hover)] hover:text-ink transition-colors" onClick={() => setDashOpen(false)}>
                      <Archive className="h-3.5 w-3.5" /> Vault
                    </Link>
                    <div className="border-t border-[var(--color-border)] mt-1 pt-1">
                      <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-stone hover:bg-[var(--surface-hover)] hover:text-ink transition-colors" onClick={handleSignOut}>
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/upload">
                  <Camera className="h-3.5 w-3.5" />
                  {PRODUCT_COPY.secondaryCta}
                </Link>
              </Button>
              <Button asChild variant="accent" size="sm" className="group">
                <Link href="/report/latest">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{PRODUCT_COPY.primaryCta}</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="accent" size="sm" className="group">
                <Link href="/upload">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Get started</span>
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-2.5 rounded-full text-ink-stone hover:text-ink hover:bg-[var(--surface-hover)] transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={menuOpen ? "close" : "open"}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.div>
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]"
            id="mobile-nav"
          >
            <div className="container py-4 space-y-1">
              {isHome &&
                NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-ink-stone hover:text-ink hover:bg-[var(--surface-hover)] rounded-xl transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              <div className="pt-3 flex flex-col gap-2 border-t border-[var(--color-border)]">
                <Button variant="outline" className="w-full" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {theme === "dark" ? "Light mode" : "Dark mode"}
                </Button>
                {user ? (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/vault" onClick={() => setMenuOpen(false)}>
                        <Archive className="h-4 w-4" /> Vault
                      </Link>
                    </Button>
                    <Button asChild variant="accent" className="w-full">
                      <Link href="/upload" onClick={() => setMenuOpen(false)}>
                        <Camera className="h-4 w-4" /> {PRODUCT_COPY.secondaryCta}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" /> Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth" onClick={() => setMenuOpen(false)}>Sign in</Link>
                    </Button>
                    <Button asChild variant="accent" className="w-full">
                      <Link href="/report/latest" onClick={() => setMenuOpen(false)}>
                        <Sparkles className="h-4 w-4" /> {PRODUCT_COPY.primaryCta}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
