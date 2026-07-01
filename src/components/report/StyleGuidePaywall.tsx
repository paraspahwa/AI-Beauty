"use client";

import * as React from "react";
import Script from "next/script";
import { Lock, Shield, Sparkles } from "lucide-react";
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
  product?: string;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

interface Props {
  reportId: string;
  onUnlocked?: () => void;
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function StyleGuidePaywall({ reportId, onUnlocked }: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState<SupportedCurrency>("INR");

  React.useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  const priceMinor =
    currency === "INR"
      ? Math.round(publicEnv.razorpay.styleGuidePriceINR * 100)
      : Math.round(publicEnv.razorpay.styleGuidePriceUSD * 100);

  const priceLabel =
    currency === "INR"
      ? fmtINR(publicEnv.razorpay.styleGuidePriceINR)
      : formatCurrency(priceMinor, currency);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          product: "style_guide_addon",
          currencyHint: currency,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to create order");
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
            razorpay_payment_id: `test_pay_sg_${Date.now()}`,
            razorpay_signature: "a".repeat(64),
          }),
        });
        const vp = await verify.json().catch(() => ({}));
        if (!verify.ok) throw new Error(vp.error ?? "Verification failed");
        setOpen(false);
        track("unlock_style_guide", { mode: "test" });
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
        description: "Personal Style Guide",
        theme: { color: "#B8734A" },
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
            track("unlock_style_guide");
            onUnlocked?.();
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="accent" size="lg" className="w-full sm:w-auto">
            <Lock className="h-4 w-4 mr-2" />
            Unlock Style Guide — {priceLabel}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md dossier-card border-terracotta/20 !p-6">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-xl">
              Personal Style Guide
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-ink-stone">
              AI-generated style board from your full-body photo — wardrobe essentials, silhouettes, and outfit inspiration.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-2xl border border-terracotta/20 bg-blush/40 p-4">
            <p className="mb-3 font-display text-3xl text-terracotta">{priceLabel}</p>
            <ul className="space-y-2 text-sm text-ink-stone">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-terracotta" /> Full-body style infographic
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-sage" /> One-time add-on purchase
              </li>
            </ul>
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-espresso py-2.5 text-sm font-bold text-[var(--btn-fg)] disabled:opacity-60 cta-shimmer"
            >
              {loading ? "Starting checkout…" : `Pay ${priceLabel}`}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-center text-sm text-red-500">{error}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
