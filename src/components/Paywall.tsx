"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import {
  Lock, Sparkles, Check, Shield, Zap, Award, Droplets, Glasses,
  Scissors, FileDown, Share2, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { publicEnv } from "@/lib/public-env";
import { formatCurrency } from "@/lib/utils";
import { detectCurrency, type SupportedCurrency } from "@/lib/currency";
import { fadeUp, staggerContainer } from "@/lib/animations";

// ── Razorpay types ────────────────────────────────────────────────────────────
interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpaySubscriptionResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}
interface CreatePaymentResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
  mode?: "real" | "test";
  requiresRealCheckout?: boolean;
}
interface CreateSubscriptionResponse {
  subscriptionId: string;
  keyId: string | null;
  currency: string;
  planId: string;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export interface PaywallProps {
  reportId: string;
  onUnlocked?: () => void;
  onSubscribed?: () => void;
  appReturnToUrl?: string;
  initialPlan?: "report" | "studio_pro";
  /** When true, forces the dialog open (e.g. from a sticky upgrade bar). */
  externalOpen?: boolean;
  onExternalOpenChange?: (v: boolean) => void;
}

// ── Plan perk lists ───────────────────────────────────────────────────────────
const REPORT_PERKS = [
  { icon: Droplets, text: "Full skin analysis + custom routine" },
  { icon: Glasses,  text: "Spectacles guide for your face shape" },
  { icon: Scissors, text: "Hairstyle, length & colour guide" },
  { icon: FileDown, text: "Downloadable PDF for stylists" },
  { icon: Share2,   text: "Shareable preview cards" },
  { icon: Sparkles, text: "5 AI Studio generations included" },
];

const PRO_PERKS = [
  { icon: Sparkles, text: "150 AI Studio generations / month" },
  { icon: Droplets, text: "Unlimited reports every month" },
  { icon: Glasses,  text: "Full analysis on every report" },
  { icon: FileDown, text: "PDF download on every report" },
  { icon: Crown,    text: "Priority AI queue" },
  { icon: Shield,   text: "Cancel anytime — no lock-in" },
];

const SOCIAL_PROOF = [
  { icon: Award,    text: "50,000+ analyses done" },
  { icon: Sparkles, text: "4.9 / 5 stars" },
  { icon: Shield,   text: "Secure payment" },
];

const TRUST_BADGES = ["256-bit SSL", "Instant delivery", "Digital product"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ═════════════════════════════════════════════════════════════════════════════
export function Paywall({ reportId, onUnlocked, onSubscribed, appReturnToUrl, initialPlan = "report", externalOpen, onExternalOpenChange }: PaywallProps) {
  const [open, setOpen]       = React.useState(false);
  const [plan, setPlan]       = React.useState<"report" | "studio_pro">(initialPlan);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState<SupportedCurrency>("INR");

  // Sync external open state
  React.useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  React.useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    onExternalOpenChange?.(v);
  };

  React.useEffect(() => { setCurrency(detectCurrency()); }, []);

  // ── Derived prices ────────────────────────────────────────────────────────
  const reportPriceMinor = currency === "INR"
    ? Math.round(publicEnv.razorpay.priceINR * 100)
    : Math.round(publicEnv.razorpay.priceUSD * 100);

  const reportLabel = currency === "INR"
    ? fmtINR(publicEnv.razorpay.priceINR)
    : formatCurrency(reportPriceMinor, currency);

  const reportStrike = currency === "INR" ? fmtINR(599) : "$9.99";

  const proLabel = currency === "INR"
    ? fmtINR(publicEnv.razorpay.priceStudioProINR)
    : `$${publicEnv.razorpay.priceStudioProUSD.toFixed(2)}`;

  // ── One-time report checkout ──────────────────────────────────────────────
  async function startReportCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, currencyHint: currency }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(
          payload.code === "PAYMENT_NOT_CONFIGURED"
            ? "Payments disabled here. Set PAYMENT_TEST_MODE=true to test."
            : (payload.error ?? "Failed to create order"),
        );
      }

      const { orderId, amount, currency: orderCurrency, keyId, mode, requiresRealCheckout } =
        payload as CreatePaymentResponse;

      // Test / dev mode
      if (mode === "test" || requiresRealCheckout === false) {
        const verify = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId,
            razorpay_order_id:    orderId,
            razorpay_payment_id:  `test_pay_${Date.now()}`,
            razorpay_signature:   "test_signature",
          }),
        });
        const vp = await verify.json().catch(() => ({}));
        if (!verify.ok) throw new Error(vp.error ?? "Verification failed");
        setOpen(false);
        onUnlocked?.();
        return;
      }

      if (!window.Razorpay || !keyId) throw new Error("Razorpay is not available right now");

      new window.Razorpay({
        key:        keyId,
        amount,
        currency:   orderCurrency,
        order_id:   orderId,
        name:       "Renovaara",
        description:"Full Beauty Report",
        theme:      { color: "#C17A5F" },
        handler: async (response: RazorpayPaymentResponse) => {
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportId,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });
          if (verify.ok) {
            setOpen(false);
            onUnlocked?.();
            if (appReturnToUrl) window.location.href = appReturnToUrl;
          }
          else setError("Verification failed — contact support if amount was deducted.");
        },
      }).open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ── Studio Pro subscription checkout ──────────────────────────────────────
  async function startProCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyHint: currency }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.code === "SUBSCRIPTION_NOT_CONFIGURED") {
          setPlan("report");
          throw new Error("Studio Pro checkout is not configured here yet. You can still unlock this report now, or set the Razorpay plan IDs later to enable monthly access.");
        }

        throw new Error(payload.error ?? "Failed to create subscription");
      }

      const { subscriptionId, keyId } = payload as CreateSubscriptionResponse;

      if (!window.Razorpay || !keyId) throw new Error("Razorpay is not available right now");

      new window.Razorpay({
        key:             keyId,
        subscription_id: subscriptionId,
        name:            "Renovaara Studio Pro",
        description:     "Monthly · 150 AI generations / month",
        theme:           { color: "#7B6E9E" },
        handler: async (response: RazorpaySubscriptionResponse) => {
          const verify = await fetch("/api/subscriptions/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id:      response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature:       response.razorpay_signature,
            }),
          });
          if (verify.ok) {
            setOpen(false);
            if (appReturnToUrl) window.location.href = appReturnToUrl;
            else onSubscribed?.();
          }
          else setError("Subscription verification failed — contact support if payment was deducted.");
        },
      }).open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCTA() {
    if (plan === "report") startReportCheckout();
    else startProCheckout();
  }

  // ── Accent colour per selected plan ──────────────────────────────────────
  const accent = plan === "studio_pro" ? "#111827" : "#111827";

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="accent" size="lg" className="group relative overflow-hidden">
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{
                background: "linear-gradient(90deg,#C17A5F,#C8A96E,#C17A5F)",
                backgroundSize: "200% 100%",
              }}
            />
            <span className="relative flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Unlock Complete Analysis — {reportLabel}
              <Zap className="h-4 w-4 animate-pulse-slow" />
            </span>
          </Button>
        </DialogTrigger>

        <AnimatePresence>
          {open && (
            <DialogContent
              className="max-w-2xl"
              style={{
                background: "linear-gradient(145deg,#fffafc,#fffafc)",
                border: "1px solid rgba(17,24,39,0.18)",
                boxShadow: "0 20px 50px rgba(17,24,39,0.14)",
              }}
            >
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {/* Header */}
                <DialogHeader>
                  <motion.div variants={fadeUp} className="mx-auto mb-3 relative">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full blur-xl"
                      style={{ background: "rgba(17,24,39,0.2)" }}
                    />
                    <div
                      className="relative flex h-14 w-14 items-center justify-center rounded-full text-obsidian shadow-glow"
                      style={{ background: "#111827" }}
                    >
                      <Lock className="h-7 w-7" />
                    </div>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <DialogTitle className="text-center text-2xl">Unlock Your Full Analysis</DialogTitle>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <DialogDescription className="text-center text-sm">
                      Choose the plan that fits — one report unlock or full monthly access.
                    </DialogDescription>
                  </motion.div>
                </DialogHeader>

                {/* ── 2-card plan selector ── */}
                <motion.div variants={fadeUp} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {/* ── Card 1 · One-Time Report ── */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPlan("report")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlan("report"); } }}
                    className="relative rounded-2xl p-4 text-left transition-all focus:outline-none cursor-pointer"
                    style={{
                      background: plan === "report" ? "rgba(17,24,39,0.12)" : "rgba(17,24,39,0.08)",
                      border:     plan === "report" ? "2px solid rgba(17,24,39,0.45)" : "2px solid rgba(17,24,39,0.16)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                          style={{ color: "#111827" }}>One-Time Report</p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-sans text-3xl leading-none" style={{ color: "#111827" }}>
                            {reportLabel}
                          </span>
                          <span className="text-xs line-through" style={{ color: "#4A3A2A" }}>
                            {reportStrike}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: "#7C5A3A" }}>this report, forever</p>
                      </div>
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full shrink-0 transition-all"
                        style={{
                          background: plan === "report" ? "#111827" : "rgba(17,24,39,0.16)",
                          border: "2px solid " + (plan === "report" ? "#111827" : "rgba(17,24,39,0.2)"),
                        }}
                      >
                        {plan === "report" && <Check className="h-3 w-3 text-obsidian" />}
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {REPORT_PERKS.map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px]" style={{ color: "#8A7A6A" }}>
                          <p.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "#111827" }} />
                          {p.text}
                        </li>
                      ))}
                    </ul>
                    {/* ── Inline CTA ── */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPlan("report"); startReportCheckout(); }}
                      disabled={loading}
                      className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: "#111827" }}
                    >
                      {loading && plan === "report" ? "Starting checkout…" : `Unlock This Report — ${reportLabel}`}
                    </button>
                  </div>

                  {/* ── Card 2 · Studio Pro ── */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPlan("studio_pro")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlan("studio_pro"); } }}
                    className="relative rounded-2xl p-4 text-left transition-all focus:outline-none cursor-pointer"
                    style={{
                      background: plan === "studio_pro" ? "rgba(17,24,39,0.14)" : "rgba(17,24,39,0.08)",
                      border:     plan === "studio_pro" ? "2px solid rgba(17,24,39,0.5)" : "2px solid rgba(17,24,39,0.16)",
                    }}
                  >
                    {/* Badge */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: "linear-gradient(135deg,#7B6E9E,#111827)" }}
                      >
                        <Crown className="h-2.5 w-2.5" /> Most Popular
                      </span>
                    </div>

                    <div className="flex items-start justify-between mb-3 mt-1">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                          style={{ color: "#111827" }}>Studio Pro</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-sans text-3xl leading-none" style={{ color: "#111827" }}>
                            {proLabel}
                          </span>
                          <span className="text-xs" style={{ color: "#6A5A7C" }}>/mo</span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: "#6A5A7C" }}>cancel anytime</p>
                      </div>
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full shrink-0 transition-all"
                        style={{
                          background: plan === "studio_pro" ? "#111827" : "rgba(17,24,39,0.16)",
                          border: "2px solid " + (plan === "studio_pro" ? "#111827" : "rgba(17,24,39,0.2)"),
                        }}
                      >
                        {plan === "studio_pro" && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {PRO_PERKS.map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px]" style={{ color: "#8A7A6A" }}>
                          <p.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "#111827" }} />
                          {p.text}
                        </li>
                      ))}
                    </ul>
                    {/* ── Inline CTA ── */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPlan("studio_pro"); startProCheckout(); }}
                      disabled={loading}
                      className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#7B6E9E,#111827)" }}
                    >
                      {loading && plan === "studio_pro" ? "Starting checkout…" : `Start Studio Pro — ${proLabel}/mo`}
                    </button>
                  </div>
                </motion.div>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center text-sm rounded-lg p-3"
                    style={{ color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                  >
                    {error}
                  </motion.p>
                )}

                {/* Social Proof */}
                <motion.div
                  variants={fadeUp}
                  className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs"
                  style={{ color: "#5A4A3A" }}
                >
                  {SOCIAL_PROOF.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <item.icon className="h-3.5 w-3.5" style={{ color: accent }} />
                      {item.text}
                    </div>
                  ))}
                </motion.div>

                {/* Trust badges */}
                <motion.div
                  variants={fadeUp}
                  className="mt-3 flex flex-wrap items-center justify-center gap-2"
                >
                  {TRUST_BADGES.map((badge, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                      style={{ color: "#5A4A3A", background: "rgba(17,24,39,0.10)", border: "1px solid rgba(17,24,39,0.14)" }}
                    >
                      <Shield className="h-3 w-3" />
                      {badge}
                    </div>
                  ))}
                </motion.div>

                <motion.p variants={fadeUp} className="mt-3 text-center text-[11px]" style={{ color: "#3A2A1A" }}>
                  Secure checkout powered by Razorpay
                </motion.p>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}
