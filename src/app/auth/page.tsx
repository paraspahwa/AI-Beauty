"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, CheckCircle2, ArrowRight, Shield, Zap, Eye } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { staggerContainer, fadeUp } from "@/lib/animations";

const FEATURES = [
  { icon: Eye, text: "Instant color season analysis" },
  { icon: Zap, text: "AI-powered face shape detection" },
  { icon: Sparkles, text: "Personalized style recommendations" },
  { icon: Shield, text: "Your photos stay private" },
];

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Show error if redirected back from /auth/callback with ?error=auth_failed
  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError("The sign-in link has expired or is invalid. Please request a new one.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(new URLSearchParams(window.location.search).get("redirect") ?? "/upload")}`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left: Brand Panel */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #12121A 0%, #1A1A26 40%, #2A2040 100%)" }}
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-2xl pointer-events-none" style={{ background: "rgba(201,149,107,0.12)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(123,110,158,0.10)" }} />

        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(201,149,107,0.2)", backdropFilter: "blur(8px)" }}>
              <Sparkles className="h-4 w-4" style={{ color: "#C9956B" }} />
            </div>
            <span className="font-serif text-xl" style={{ color: "#F0E8D8" }}>StyleAI</span>
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div variants={fadeUp}>
            <h2 className="text-3xl font-serif leading-snug mb-4">
              Discover the colors and styles made for you
            </h2>
            <p className="text-white/80 leading-relaxed">
              One selfie is all it takes. Get your personalized color season, face shape analysis,
              and style guide in minutes.
            </p>
          </motion.div>

          <motion.ul variants={staggerContainer} className="space-y-4">
            {FEATURES.map((f) => (
              <motion.li key={f.text} variants={fadeUp} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(201,149,107,0.15)" }}>
                  <f.icon className="h-4 w-4" style={{ color: "#C9956B" }} />
                </div>
                <span className="text-sm" style={{ color: "rgba(240,232,216,0.85)" }}>{f.text}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={fadeUp} className="text-sm" style={{ color: "rgba(240,232,216,0.5)" }}>
          Trusted by 50,000+ style enthusiasts
        </motion.div>
      </motion.div>

      {/* Right: Auth Form */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="flex items-center justify-center p-6 sm:p-12"
        style={{ background: "#0A0A0F" }}
      >
        <div className="w-full max-w-md space-y-8">
          <motion.div variants={fadeUp} className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-obsidian" style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)" }}>
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-serif text-xl text-ink">StyleAI</span>
          </motion.div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(123,110,158,0.15)" }}>
                <CheckCircle2 className="h-8 w-8" style={{ color: "#7B6E9E" }} />
              </div>
              <h1 className="font-serif text-2xl text-ink">Check your inbox</h1>
              <p className="text-ink-stone leading-relaxed">
                We sent a magic link to <span className="font-medium text-ink">{email}</span>.
                Click it to sign in — no password needed.
              </p>
              <p className="text-xs text-ink-mist">
                {"Didn't receive it? Check spam or "}
                <button className="underline hover:text-ink transition-colors" onClick={() => setSent(false)}>
                  try again
                </button>.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div variants={fadeUp}>
                <h1 className="font-serif text-3xl text-ink mb-2">Sign in to StyleAI</h1>
                <p className="text-ink-stone">
                  {"Enter your email and we'll send you a magic link — no password required."}
                </p>
              </motion.div>

              <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-ink">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mist" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all"
                      style={{
                        background: "rgba(26,26,38,0.9)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#F0E8D8",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm rounded-lg px-3 py-2" style={{ color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>{error}</p>
                )}

                <Button type="submit" variant="accent" size="lg" disabled={loading || !email} className="w-full group">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending link…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue with email
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </motion.form>

              <motion.div variants={fadeUp} className="text-center space-y-3">
                <p className="text-xs text-ink-mist">
                  By continuing, you agree to our{" "}
                  <Link href="#" className="underline hover:text-ink transition-colors">Terms</Link>
                  {" "}and{" "}
                  <Link href="#" className="underline hover:text-ink transition-colors">Privacy Policy</Link>.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-ink-mist">
                  <Shield className="h-3.5 w-3.5" style={{ color: "#7B6E9E" }} />
                  No password. No spam. Cancel anytime.
                </div>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
