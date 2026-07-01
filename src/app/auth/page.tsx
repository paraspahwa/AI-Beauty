"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, CheckCircle2, ArrowRight, Shield, Zap, Eye, Phone, ChevronLeft, Lock, EyeOff } from "lucide-react";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { sanitizePostAuthPath } from "@/lib/auth/safe-redirect";
import { NextStepHint } from "@/components/ui/NextStepHint";
import type { JourneyHint } from "@/lib/report/journey-hints";

const POST_AUTH_HINT: JourneyHint = {
  id: "auth-upload-next",
  step: "After sign-in",
  title: "Next: upload your selfie",
  body: "One clear photo in natural light — we'll analyse your face shape and start your free preview board automatically.",
  tone: "action",
  ctaLabel: "See the upload guide",
  href: "/upload",
};

function resolvePostAuthPath(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect") ?? searchParams.get("next");
  return sanitizePostAuthPath(redirect, "/upload");
}

const FEATURES = [
  { icon: Eye, text: "Free face-shape preview" },
  { icon: Zap, text: "AI-powered colour season analysis" },
  { icon: Sparkles, text: "6 infographic beauty analysis + optional Style Guide" },
  { icon: Shield, text: "Your photos stay private" },
];

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}

/** Shared input class */
const inputClassName =
  "auth-input w-full rounded-xl text-sm placeholder:text-ink-mist focus:outline-none focus:ring-2 focus:ring-terracotta/30 transition-all";

const OTP_LENGTH = 6;

type CountryOption = {
  iso: string;
  name: string;
  dial: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "AE", name: "UAE", dial: "+971" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "SG", name: "Singapore", dial: "+65" },
];

function detectDefaultCountry(): CountryOption {
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-IN";
  const region = locale.split("-")[1]?.toUpperCase();
  return COUNTRY_OPTIONS.find((c) => c.iso === region) ?? COUNTRY_OPTIONS[0];
}

function toE164(phoneInput: string, countryDial: string): string {
  const trimmed = phoneInput.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  const local = digitsOnly.replace(/^0+/, "");
  return `${countryDial}${local}`;
}

function mapPhoneSendError(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many OTP attempts. Please wait a minute and try again.";
  }
  if (msg.includes("sms has not been enabled") || msg.includes("sms provider")) {
    return "SMS login is not configured yet. Please use email sign in for now.";
  }
  if (msg.includes("trial") || msg.includes("21608") || msg.includes("verified") || msg.includes("permission to send")) {
    return "SMS provider blocked this destination. In Twilio trial, only verified numbers can receive OTP.";
  }
  if (msg.includes("invalid") && msg.includes("phone")) {
    return "Phone number looks invalid. Check the country and number format.";
  }

  return "Could not send OTP right now. Please try again or use email sign in.";
}

function mapPhoneVerifyError(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("expired")) return "OTP expired. Please request a new code.";
  if (msg.includes("invalid") || msg.includes("token")) return "Invalid code. Please check the SMS and retry.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Too many verification attempts. Wait a minute and retry.";

  return "Could not verify OTP. Please request a new code.";
}

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = digit;
    const next = arr.join("").slice(0, OTP_LENGTH);
    onChange(next);
    if (digit && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      e.preventDefault();
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`${inputClassName} text-center text-xl font-semibold`}
          style={{
            height: "3.25rem",
            borderColor: value[i] ? "var(--terracotta)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function AuthContent() {
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");

  // Email+password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // for magic link fallback
  const [signupDone, setSignupDone] = useState(false);

  // Phone state
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [sentE164, setSentE164] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const searchParams = useSearchParams();
  const nextPath = resolvePostAuthPath(searchParams);
  const phoneCountryLabel = useMemo(() => `${phoneCountry.iso} ${phoneCountry.dial}`, [phoneCountry]);
  const supabaseConfigured = isSupabaseBrowserConfigured();

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError("The sign-in link has expired or is invalid. Please request a new one.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!supabaseConfigured) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const target = resolvePostAuthPath(searchParams);
      window.location.replace(target);
    });
  }, [searchParams, supabaseConfigured]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    setPhoneCountry(detectDefaultCountry());
  }, []);

  function switchTab(next: "email" | "phone") {
    setTab(next);
    setError(null);
    setOtp("");
    setSentE164("");
    setOtpSent(false);
    setEmailSent(false);
    setSignupDone(false);
    setPassword("");
  }

  // ── Email + password ─────────────────────────────────────────────────────
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
          setError("Incorrect email or password. Please try again.");
        } else if (msg.includes("email not confirmed")) {
          setError("Please confirm your email first. Check your inbox for a confirmation link.");
        } else {
          setError(error.message);
        }
      } else {
        const safe = /^\/[^/]/.test(nextPath) ? nextPath : "/upload";
        window.location.href = safe;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("user already")) {
          setError("An account with this email already exists. Sign in instead.");
        } else if (msg.includes("password")) {
          setError("Password must be at least 6 characters.");
        } else {
          setError(error.message);
        }
      } else if (data.user && !data.session) {
        // Supabase requires email confirmation
        setSignupDone(true);
      } else {
        // Auto-confirmed (e.g. Supabase project has confirmations disabled)
        const safe = /^\/[^/]/.test(nextPath) ? nextPath : "/upload";
        window.location.href = safe;
      }
    }
  }

  // ── Email magic link (secondary / fallback) ───────────────────────────────
  async function handleMagicLink() {
    if (!email || cooldown > 0) return;
    if (!supabaseConfigured) {
      setError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("email rate")) {
        setError("Too many emails sent. Please wait a few minutes.");
      } else {
        setError(error.message);
      }
      setCooldown(60);
    } else {
      setCooldown(60);
      setEmailSent(true);
    }
  }

  // ── Phone OTP: send ───────────────────────────────────────────────────────
  async function handlePhoneSend(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    if (!supabaseConfigured) {
      setError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    setLoading(true);
    setError(null);

    const e164 = toE164(phone, phoneCountry.dial);
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
      setLoading(false);
      setError("Enter a valid phone number.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });

    setLoading(false);
    if (error) {
      setError(mapPhoneSendError(error.message));
      setCooldown(60);
    } else {
      setSentE164(e164);
      setCooldown(60);
      setOtpSent(true);
    }
  }

  // ── Phone OTP: verify ─────────────────────────────────────────────────────
  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < OTP_LENGTH) return;
    if (!supabaseConfigured) {
      setError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    setLoading(true);
    setError(null);

    const e164 = sentE164 || toE164(phone, phoneCountry.dial);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: "sms",
    });

    setLoading(false);
    if (error) {
      setError(mapPhoneVerifyError(error.message));
      setOtp("");
    } else {
      const safe = /^\/[^/]/.test(nextPath) ? nextPath : "/upload";
      window.location.href = safe;
    }
  }

  // ── Shared brand panel ────────────────────────────────────────────────────
  const BrandPanel = (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="auth-panel-brand hidden lg:flex flex-col justify-between p-12 text-ink relative overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-terracotta/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-rose-gold/10 blur-3xl" />
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso">
            <Sparkles className="h-4 w-4 text-[var(--btn-fg)]" />
          </div>
          <span className="font-display text-xl text-ink">Renovaara</span>
        </div>
      </motion.div>
      <div className="space-y-8">
        <motion.div variants={fadeUp}>
          <h2 className="font-display text-3xl leading-snug mb-4">Discover the colours and styles made for you</h2>
          <p className="text-ink-stone leading-relaxed">One selfie is all it takes. Get your colour season, face-shape preview, and six analysis infographics in minutes.</p>
        </motion.div>
        <motion.ul variants={staggerContainer} className="space-y-4">
          {FEATURES.map((f) => (
            <motion.li key={f.text} variants={fadeUp} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta/15">
                <f.icon className="h-4 w-4 text-terracotta" />
              </div>
              <span className="text-sm text-ink-stone">{f.text}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
      <motion.div variants={fadeUp} className="text-sm text-ink-mist">
        Trusted by 50,000+ style enthusiasts
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-app-viewport grid lg:grid-cols-2">
      {BrandPanel}

      {/* Right: Auth Form */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="flex items-center justify-center bg-[var(--color-background)] p-6 sm:p-12"
      >
        <div className="w-full max-w-md space-y-8">
          <motion.div variants={fadeUp} className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso">
              <Sparkles className="h-4 w-4 text-[var(--btn-fg)]" />
            </div>
            <span className="font-display text-xl text-ink">Renovaara</span>
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── MAGIC LINK SENT ───────────────────────────────────────── */}
            {tab === "email" && emailSent ? (
              <motion.div key="email-sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
                  <CheckCircle2 className="h-8 w-8 text-sage" />
                </div>
                <h1 className="font-display text-2xl text-ink">Check your inbox</h1>
                <p className="text-ink-stone leading-relaxed">
                  We sent a magic link to <span className="font-medium text-ink">{email}</span>. Click it to sign in.
                </p>
                <p className="text-xs text-ink-mist">
                  {"Didn't receive it? Check spam or "}
                  <button
                    className="underline hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => setEmailSent(false)}
                    disabled={cooldown > 0}
                  >
                    {cooldown > 0 ? `try again in ${cooldown}s` : "try again"}
                  </button>.
                </p>
                <NextStepHint hint={POST_AUTH_HINT} className="text-left" />
              </motion.div>

            ) : tab === "email" && signupDone ? (
              <motion.div key="signup-done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
                  <CheckCircle2 className="h-8 w-8 text-sage" />
                </div>
                <h1 className="font-display text-2xl text-ink">Confirm your email</h1>
                <p className="text-ink-stone leading-relaxed">
                  We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Click it to activate your account, then come back and sign in.
                </p>
                <button
                  className="text-xs underline text-ink-mist hover:text-ink transition-colors"
                  onClick={() => { setSignupDone(false); setEmailMode("signin"); }}
                >
                  Back to sign in
                </button>
                <NextStepHint hint={POST_AUTH_HINT} className="text-left" />
              </motion.div>

            ) : tab === "phone" && otpSent ? (

              /* ── OTP VERIFY ──────────────────────────────────────────────── */
              <motion.div key="otp-verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <button onClick={() => { setOtpSent(false); setOtp(""); setError(null); }} className="flex items-center gap-1 text-sm text-ink-mist hover:text-ink transition-colors mb-6">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  <h1 className="font-display text-3xl text-ink mb-2">Enter the code</h1>
                  <p className="text-ink-stone text-sm">
                    We sent a {OTP_LENGTH}-digit code to <span className="font-medium text-ink">{sentE164 || phone}</span>
                  </p>
                </div>

                <form onSubmit={handleOtpVerify} className="space-y-6">
                  <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />

                  {error && (
                    <p className="error-banner text-sm rounded-lg px-3 py-2 text-center">{error}</p>
                  )}

                  <Button type="submit" variant="accent" size="lg" disabled={loading || otp.length < OTP_LENGTH} className="w-full">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Verifying…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Verify & sign in
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-ink-mist">
                  {"Didn't get a code? "}
                  <button
                    className="underline hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                    disabled={cooldown > 0}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                  </button>
                </p>
              </motion.div>

            ) : (

              /* ── MAIN FORM ────────────────────────────────────────────────── */
              <motion.div key="main-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {!supabaseConfigured && (
                  <div className="rounded-xl border border-terracotta/25 bg-terracotta/10 px-4 py-3 text-sm text-ink-stone">
                    <p className="font-medium text-ink">Local dev: auth not configured</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      Add <code className="text-rose-gold">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                      <code className="text-rose-gold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                      <code className="text-rose-gold">.env.local</code> to enable sign-in.
                    </p>
                  </div>
                )}
                <div>
                  <h1 className="font-display text-3xl text-ink mb-2">Sign in to Renovaara</h1>
                  <p className="text-ink-stone text-sm">No password needed — choose how you want to sign in.</p>
                </div>

                {/* Tab switcher */}
                <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-blush/50 p-1">
                  {(["email", "phone"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => switchTab(t)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${tab === t ? "auth-tab-active" : "auth-tab-inactive"}`}
                    >
                      {t === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                      {t === "email" ? "Email" : "Phone"}
                    </button>
                  ))}
                </div>

                {/* Sign in / Sign up toggle (email tab only) */}
                {tab === "email" && (
                  <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
                    {(["signin", "signup"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setEmailMode(m); setError(null); }}
                        className={`flex-1 py-2 text-xs font-medium transition-all ${emailMode === m ? "auth-tab-active" : "auth-tab-inactive"}`}
                      >
                        {m === "signin" ? "Sign in" : "Create account"}
                      </button>
                    ))}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {tab === "email" ? (

                    /* Email + password form */
                    <motion.form key={`email-${emailMode}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} onSubmit={handlePasswordSubmit} className="space-y-4">
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
                            className={`${inputClassName} pl-10 pr-4 py-3`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-ink">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mist" />
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={emailMode === "signup" ? "Min 6 characters" : "Your password"}
                            required
                            minLength={6}
                            className={`${inputClassName} pl-10 pr-10 py-3`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-mist hover:text-ink transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {error && <p className="error-banner text-sm rounded-lg px-3 py-2">{error}</p>}
                      <Button type="submit" variant="accent" size="lg" disabled={loading || !email || !password || !supabaseConfigured} className="w-full group">
                        {loading ? (
                          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{emailMode === "signin" ? "Signing in…" : "Creating account…"}</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            {emailMode === "signin" ? "Sign in" : "Create account"}
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </Button>
                      {/* Magic link fallback */}
                      <p className="text-xs text-center text-ink-mist">
                        Prefer a link?{" "}
                        <button
                          type="button"
                          onClick={handleMagicLink}
                          disabled={!email || loading || cooldown > 0 || !supabaseConfigured}
                          className="underline hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {cooldown > 0 ? `Send magic link (${cooldown}s)` : "Send me a magic link"}
                        </button>
                      </p>
                    </motion.form>

                  ) : (

                    /* Phone form */
                    <motion.form key="phone-form" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} onSubmit={handlePhoneSend} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium text-ink">Phone number</label>
                        <div className="flex gap-2">
                          <select
                            aria-label="Country code"
                            value={phoneCountry.iso}
                            onChange={(e) => {
                              const selected = COUNTRY_OPTIONS.find((c) => c.iso === e.target.value);
                              if (selected) setPhoneCountry(selected);
                            }}
                            className={`${inputClassName} px-3`}
                            style={{ minWidth: "7.25rem" }}
                          >
                            {COUNTRY_OPTIONS.map((c) => (
                              <option key={c.iso} value={c.iso}>
                                {c.iso} {c.dial}
                              </option>
                            ))}
                          </select>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mist" />
                          <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="98765 43210"
                            required
                            className={`${inputClassName} pl-10 pr-4 py-3`}
                          />
                          </div>
                        </div>
                        <p className="text-xs text-ink-mist">Detected country: {phoneCountryLabel}. You can change it from the dropdown.</p>
                      </div>
                      {error && <p className="error-banner text-sm rounded-lg px-3 py-2">{error}</p>}
                      <Button type="submit" variant="accent" size="lg" disabled={loading || !phone || cooldown > 0 || !supabaseConfigured} className="w-full group">
                        {loading ? (
                          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending code…</span>
                        ) : cooldown > 0 ? (
                          <span>Resend in {cooldown}s</span>
                        ) : (
                          <span className="flex items-center gap-2">Send OTP<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="text-center space-y-3">
                  <p className="text-xs text-ink-mist">
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-ink transition-colors">Terms</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="underline hover:text-ink transition-colors">Privacy Policy</Link>.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-ink-mist">
                    <Shield className="h-3.5 w-3.5 text-sage" />
                    No password. No spam. Cancel anytime.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

