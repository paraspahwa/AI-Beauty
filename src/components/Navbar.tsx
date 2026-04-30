"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, Camera, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const isHome = pathname === "/";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Sync auth state
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled || !isHome
          ? "border-b border-white/5 backdrop-blur-xl shadow-premium"
          : "backdrop-blur-sm",
        "bg-obsidian-50/90",
      )}
    >
      <div className="container max-w-6xl flex h-16 items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <motion.div
            whileHover={{ rotate: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="flex h-8 w-8 items-center justify-center rounded-full shadow-glow"
            style={{ background: "linear-gradient(135deg, #C9956B, #E8C990, #D4857A)" }}
          >
            <Sparkles className="h-4 w-4 text-obsidian" />
          </motion.div>
          <span className="font-serif text-xl text-ink group-hover:text-chrome transition-colors">
            StyleAI
          </span>
        </Link>

        {/* Desktop nav links */}
        {isHome && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm text-ink-stone hover:text-ink transition-colors rounded-full hover:bg-white/5 group"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side CTA */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  My Reports
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
              <Button asChild variant="accent" size="sm" className="group">
                <Link href="/upload">
                  <Camera className="h-3.5 w-3.5" />
                  <span>New report</span>
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
                  <Camera className="h-3.5 w-3.5" />
                  <span>Get my report</span>
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-2 rounded-full text-ink-stone hover:text-ink hover:bg-cream-200 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
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
            className="md:hidden overflow-hidden border-t border-white/5 backdrop-blur-xl surface-deep"
          >
            <div className="container py-4 space-y-1">
              {isHome &&
                NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-ink-stone hover:text-ink hover:bg-white/5 rounded-xl transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              <div className="pt-3 flex flex-col gap-2 border-t border-white/5">
                {user ? (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                        <LayoutDashboard className="h-4 w-4" /> My Reports
                      </Link>
                    </Button>
                    <Button asChild variant="accent" className="w-full">
                      <Link href="/upload" onClick={() => setMenuOpen(false)}>
                        <Camera className="h-4 w-4" /> New report
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
                      <Link href="/upload" onClick={() => setMenuOpen(false)}>
                        <Camera className="h-4 w-4" /> Get my report
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
