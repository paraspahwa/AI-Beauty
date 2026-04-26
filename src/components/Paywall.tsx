"use client";

import * as React from "react";
import Script from "next/script";
import { Lock, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { env } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void }; }
}

interface PaywallProps {
  reportId: string;
  /** Called after successful checkout signature verification. */
  onUnlocked?: () => void;
}

const PERKS = [
  "Full skin analysis with custom routine",
  "Spectacles guide tailored to your face shape",
  "Hairstyle, length & color recommendations",
  "Downloadable PDF for stylists & shopping",
  "Shareable preview cards for socials",
];

export function Paywall({ reportId, onUnlocked }: PaywallProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create order");
      const { orderId, amount, currency, keyId } = await res.json();

      if (!window.Razorpay) throw new Error("Razorpay SDK not loaded");

      const rz = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "StyleAI",
        description: "Full Beauty Report",
        theme: { color: "#7A5234" },
        handler: async (response: Record<string, string>) => {
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
            onUnlocked?.();
          } else {
            setError("Payment verification failed");
          }
        },
      });
      rz.open();
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
          <Button variant="accent" size="lg">
            <Lock className="h-4 w-4" /> Unlock Full Report — {formatCurrency(env.razorpay.priceINR * 100, "INR")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-deep">
              <Sparkles className="h-6 w-6" />
            </span>
            <DialogTitle>Unlock your full report</DialogTitle>
            <DialogDescription>
              You&apos;re seeing the free preview. Unlock all 5 sections plus PDF.
            </DialogDescription>
          </DialogHeader>

          <ul className="my-5 space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-ink-soft">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {p}
              </li>
            ))}
          </ul>

          {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

          <Button variant="accent" size="lg" className="w-full" onClick={startCheckout} disabled={loading}>
            {loading ? "Starting checkout…" : `Pay ${formatCurrency(env.razorpay.priceINR * 100, "INR")}`}
          </Button>
          <p className="mt-2 text-center text-xs text-ink-muted">
            Secure checkout powered by Razorpay.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
