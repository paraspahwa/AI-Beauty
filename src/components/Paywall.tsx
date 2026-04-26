"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import { Lock, Sparkles, Check, Shield, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { env } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";
import { modalVariants, backdropVariants, fadeUp, staggerContainer } from "@/lib/animations";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

interface PaywallProps {
  reportId: string;
  /** Called after successful checkout signature verification. */
  onUnlocked?: () => void;
}

const PERKS = [
  {
    icon: Sparkles,
    text: "Full skin analysis with custom routine",
  },
  {
    icon: Sparkles,
    text: "Spectacles guide tailored to your face shape",
  },
  {
    icon: Sparkles,
    text: "Hairstyle, length & color recommendations",
  },
  {
    icon: Sparkles,
    text: "Downloadable PDF for stylists & shopping",
  },
  {
    icon: Sparkles,
    text: "Shareable preview cards for socials",
  },
];

const SOCIAL_PROOF = [
  { icon: Award, text: "2,847 unlocked today" },
  { icon: Sparkles, text: "4.9/5 stars" },
  { icon: Shield, text: "30-day refund" },
];

const TRUST_BADGES = [
  "256-bit SSL",
  "Instant delivery",
  "Money back guarantee",
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
        theme: { color: "#C17A5F" },
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
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="accent" size="lg" className="group relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-terracotta via-camel to-terracotta opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ backgroundSize: "200% 100%" }}
            />
            <span className="relative flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Unlock Full Report — {formatCurrency(env.razorpay.priceINR * 100, "INR")}
              <Zap className="h-4 w-4 animate-pulse-slow" />
            </span>
          </Button>
        </DialogTrigger>

        <AnimatePresence>
          {open && (
            <DialogContent className="glass border-2 border-white/20 shadow-premium max-w-lg">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <DialogHeader>
                  {/* Animated lock icon with pulse */}
                  <motion.div
                    variants={fadeUp}
                    className="mx-auto mb-4 relative"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-full bg-terracotta/30 blur-xl"
                    />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-camel text-white shadow-premium">
                      <Lock className="h-8 w-8" />
                    </div>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <DialogTitle className="text-center text-2xl sm:text-3xl">
                      Unlock Your Complete Analysis
                    </DialogTitle>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <DialogDescription className="text-center text-base">
                      You're seeing the free preview. Unlock all sections plus PDF.
                    </DialogDescription>
                  </motion.div>
                </DialogHeader>

                {/* Pricing */}
                <motion.div
                  variants={fadeUp}
                  className="my-6 text-center rounded-2xl bg-gradient-to-br from-terracotta/10 via-camel/10 to-sage/10 p-6 border border-cream-200"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="font-serif text-5xl text-ink">
                      {formatCurrency(env.razorpay.priceINR * 100, "INR")}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm text-ink-mist line-through">$29.99</span>
                      <span className="inline-block bg-terracotta text-white text-xs font-bold px-2 py-0.5 rounded">
                        67% OFF
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-ink-stone">Limited time offer</p>
                </motion.div>

                {/* Feature Checklist */}
                <motion.ul
                  variants={staggerContainer}
                  className="space-y-3 mb-6"
                >
                  {PERKS.map((perk, index) => (
                    <motion.li
                      key={index}
                      variants={fadeUp}
                      className="flex items-start gap-3 text-sm text-ink-stone"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 * index, type: "spring" }}
                        className="shrink-0"
                      >
                        <Check className="h-5 w-5 text-sage" />
                      </motion.div>
                      <span>{perk.text}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 text-center text-sm text-danger bg-danger/10 rounded-lg p-3"
                  >
                    {error}
                  </motion.p>
                )}

                {/* CTA Button */}
                <motion.div variants={fadeUp}>
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full text-lg h-14 shadow-premium relative overflow-hidden group"
                    onClick={startCheckout}
                    disabled={loading}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-terracotta-dark via-terracotta to-terracotta-dark opacity-0 group-hover:opacity-100 transition-opacity"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ backgroundSize: "200% 100%" }}
                    />
                    <span className="relative flex items-center gap-2">
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="h-5 w-5" />
                          </motion.div>
                          Starting checkout...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Unlock Full Report — {formatCurrency(env.razorpay.priceINR * 100, "INR")}
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                  variants={fadeUp}
                  className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-stone"
                >
                  {SOCIAL_PROOF.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <item.icon className="h-3.5 w-3.5 text-terracotta" />
                      {item.text}
                    </div>
                  ))}
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                  variants={fadeUp}
                  className="mt-4 flex flex-wrap items-center justify-center gap-3"
                >
                  {TRUST_BADGES.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 text-xs text-ink-mist bg-cream-100 rounded-full px-3 py-1"
                    >
                      <Shield className="h-3 w-3" />
                      {badge}
                    </div>
                  ))}
                </motion.div>

                <motion.p
                  variants={fadeUp}
                  className="mt-4 text-center text-xs text-ink-mist"
                >
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
