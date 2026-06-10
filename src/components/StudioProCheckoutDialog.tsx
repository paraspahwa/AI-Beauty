"use client";

import * as React from "react";
import Script from "next/script";
import { Crown, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publicEnv } from "@/lib/public-env";
import { detectCurrency, type SupportedCurrency } from "@/lib/currency";
import { PRODUCT_COPY } from "@/lib/product-copy";
import { track } from "@/lib/track";

interface RazorpaySubscriptionResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
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

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const PRO_PERKS = [
  `${PRODUCT_COPY.studioPro.studioGensPerMonth} AI try-ons per month`,
  "Unlimited full reports every month",
  "Priority AI processing queue",
  "Cancel anytime — no lock-in",
];

export type StudioProCheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnUrl?: string;
  onSubscribed?: () => void;
};

export function StudioProCheckoutDialog({
  open,
  onOpenChange,
  returnUrl,
  onSubscribed,
}: StudioProCheckoutDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState<SupportedCurrency>("INR");

  React.useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  const proLabel = currency === "INR"
    ? `${fmtINR(publicEnv.razorpay.priceStudioProINR)}/mo`
    : `$${publicEnv.razorpay.priceStudioProUSD.toFixed(2)}/mo`;

  async function startCheckout() {
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
        throw new Error(payload.error ?? "Failed to create subscription");
      }

      const { subscriptionId, keyId } = payload as CreateSubscriptionResponse;

      if (!window.Razorpay || !keyId) {
        throw new Error("Razorpay is not available right now");
      }

      new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: "Renovaara Studio Pro",
        description: `Monthly · ${PRODUCT_COPY.studioPro.studioGensPerMonth} AI generations / month`,
        theme: { color: "#111827" },
        handler: async (response: RazorpaySubscriptionResponse) => {
          const verify = await fetch("/api/subscriptions/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (verify.ok) {
            onOpenChange(false);
            track("subscribe_studio_pro");
            onSubscribed?.();
            window.location.href = returnUrl ?? "/success?type=studio_pro";
          } else {
            setError("Subscription verification failed — contact support if payment was deducted.");
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md"
          style={{
            background: "linear-gradient(145deg,#fffafc,#fffafc)",
            border: "1px solid rgba(17,24,39,0.18)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <Crown className="h-5 w-5" />
              {PRODUCT_COPY.studioPro.name}
            </DialogTitle>
            <DialogDescription className="text-ink-stone">
              {PRODUCT_COPY.studioPro.tagline}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-2xl font-semibold text-ink">{proLabel}</p>
            <ul className="space-y-2">
              {PRO_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-ink-stone">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#111827]" />
                  {perk}
                </li>
              ))}
            </ul>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1 bg-[#111827] text-white hover:bg-[#111827]/95"
                disabled={loading}
                onClick={() => void startCheckout()}
              >
                {loading ? "Opening checkout…" : `Subscribe — ${proLabel}`}
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Not now
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-stone">
              <Shield className="h-3.5 w-3.5" />
              Secure payment via Razorpay
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Opens Studio Pro checkout when ?checkout=studio_pro is present (dashboard). */
export function StudioProCheckoutLauncher() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "studio_pro") {
      // #region agent log
      fetch('http://127.0.0.1:7426/ingest/c98621ce-d232-4690-a505-eaf5b197033b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6b59e2'},body:JSON.stringify({sessionId:'6b59e2',location:'StudioProCheckoutDialog.tsx:launcher',message:'checkout dialog opening',data:{checkout:'studio_pro'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setOpen(true);
      params.delete("checkout");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
    }
  }, []);

  return <StudioProCheckoutDialog open={open} onOpenChange={setOpen} />;
}

/** Auto-opens checkout on mount (e.g. upload?intent=studio). */
export function StudioProCheckoutAutoOpen({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled]);

  if (!enabled) return null;
  return <StudioProCheckoutDialog open={open} onOpenChange={setOpen} />;
}
