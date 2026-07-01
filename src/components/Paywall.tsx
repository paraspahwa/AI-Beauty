"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import { Lock, Sparkles, Check, Shield, Zap, Droplets, Glasses, Scissors, FileDown, Palette } from "lucide-react";
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
import { track } from "@/lib/track";

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
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

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export interface PaywallProps {
  reportId: string;
  onUnlocked?: () => void;
  appReturnToUrl?: string;
  externalOpen?: boolean;
  onExternalOpenChange?: (v: boolean) => void;
}

const REPORT_PERKS = [
  { icon: Sparkles, text: "Face features infographic" },
  { icon: Droplets, text: "Skin analysis infographic" },
  { icon: Palette, text: "Colour season infographic" },
  { icon: Scissors, text: "Hairstyle & hair colour infographics" },
  { icon: Glasses, text: "Spectacles guide infographic" },
  { icon: FileDown, text: "Downloadable analysis PDF" },
];

const SOCIAL_PROOF = [
  { icon: Sparkles, text: "50,000+ analyses done" },
  { icon: Shield, text: "Secure payment" },
];

const TRUST_BADGES = ["256-bit SSL", "Instant delivery", "Digital product"];

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function Paywall({
  reportId,
  onUnlocked,
  appReturnToUrl,
  externalOpen,
  onExternalOpenChange,
}: PaywallProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState<SupportedCurrency>("INR");

  React.useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    onExternalOpenChange?.(v);
  };

  React.useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  const reportPriceMinor =
    currency === "INR"
      ? Math.round(publicEnv.razorpay.priceINR * 100)
      : Math.round(publicEnv.razorpay.priceUSD * 100);

  const reportLabel =
    currency === "INR"
      ? fmtINR(publicEnv.razorpay.priceINR)
      : formatCurrency(reportPriceMinor, currency);

  const reportStrike = currency === "INR" ? fmtINR(599) : "$9.99";

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

      if (mode === "test" || requiresRealCheckout === false) {
        const verify = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId,
            razorpay_order_id: orderId,
            razorpay_payment_id: `test_pay_${Date.now()}`,
            razorpay_signature: "test_signature",
          }),
        });
        const vp = await verify.json().catch(() => ({}));
        if (!verify.ok) throw new Error(vp.error ?? "Verification failed");
        setOpen(false);
        track("unlock_analysis", { plan: "report", mode: "test" });
        onUnlocked?.();
        return;
      }

      if (!window.Razorpay || !keyId) throw new Error("Razorpay is not available right now");

      new window.Razorpay({
        key: keyId,
        amount,
        currency: orderCurrency,
        order_id: orderId,
        name: "Renovaara",
        description: "Full Beauty Report",
        theme: { color: "#C17A5F" },
        handler: async (response: RazorpayPaymentResponse) => {
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (verify.ok) {
            setOpen(false);
            track("unlock_analysis", { plan: "report" });
            onUnlocked?.();
            if (appReturnToUrl) window.location.href = appReturnToUrl;
          } else {
            setError("Verification failed — contact support if amount was deducted.");
          }
        },
      }).open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

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
                background: "linear-gradient(90deg, var(--terracotta), var(--rose-gold), var(--terracotta))",
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
            <DialogContent className="max-w-lg dossier-card border-terracotta/20 shadow-premium !p-6">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <DialogHeader>
                  <motion.div variants={fadeUp} className="mx-auto mb-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-espresso text-[var(--btn-fg)] shadow-glow cta-glow">
                      <Lock className="h-7 w-7" />
                    </div>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <DialogTitle className="text-center font-display text-2xl">Unlock Your Full Report</DialogTitle>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <DialogDescription className="text-center text-sm">
                      One-time purchase — six analysis infographics and PDF download. Style Guide available as add-on.
                    </DialogDescription>
                  </motion.div>
                </DialogHeader>

                <motion.div variants={fadeUp} className="mt-5 rounded-2xl border-2 border-terracotta/25 bg-blush/50 p-4">
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="font-display text-3xl leading-none text-terracotta">
                      {reportLabel}
                    </span>
                    <span className="text-xs text-ink-mist line-through">
                      {reportStrike}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {REPORT_PERKS.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-ink-stone">
                        <p.icon className="h-3.5 w-3.5 shrink-0 text-terracotta" />
                        {p.text}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={startReportCheckout}
                    disabled={loading}
                    className="mt-4 w-full rounded-xl bg-espresso py-2.5 text-sm font-bold text-[var(--btn-fg)] transition-opacity hover:opacity-90 disabled:opacity-60 cta-shimmer"
                  >
                    {loading ? "Starting checkout…" : `Unlock — ${reportLabel}`}
                  </button>
                </motion.div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="error-banner mt-3 rounded-lg p-3 text-center text-sm"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-stone">
                  {SOCIAL_PROOF.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <item.icon className="h-3.5 w-3.5 text-sage" />
                      {item.text}
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={fadeUp} className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {TRUST_BADGES.map((badge, i) => (
                    <div key={i} className="report-chip flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      {badge}
                    </div>
                  ))}
                </motion.div>

                <motion.p variants={fadeUp} className="mt-4 text-center text-[11px] text-ink-mist">
                  Secure checkout powered by Razorpay ·{" "}
                  <Link href="/upload" className="underline-offset-2 hover:underline">
                    New analysis
                  </Link>
                </motion.p>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}
