"use client";

import * as React from "react";
import { Ticket, Check, X } from "lucide-react";

interface Props {
  onCouponApplied: (discountType: string, discountValue: number) => void;
  onCouponRemoved: () => void;
}

export function CouponInput({ onCouponApplied, onCouponRemoved }: Props) {
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [message, setMessage] = React.useState("");

  async function handleApply() {
    if (!code.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setStatus("valid");
        setMessage(`${data.discountValue === 100 ? "FREE!" : `${data.discountValue}% off!`} ${data.note ?? ""}`);
        onCouponApplied(data.discountType, data.discountValue);
      } else {
        setStatus("invalid");
        setMessage(data.error ?? "Invalid code");
      }
    } catch {
      setStatus("invalid");
      setMessage("Could not validate code. Try again.");
    }
  }

  function handleRemove() {
    setCode("");
    setStatus("idle");
    setMessage("");
    onCouponRemoved();
  }

  return (
    <div className="mt-4">
      {status === "valid" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-2.5 text-sm dark:bg-emerald-950/30">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="flex-1 font-medium text-emerald-800 dark:text-emerald-200">
            Coupon applied — {message}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mist" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="auth-input w-full rounded-xl pl-9 pr-3 py-2.5 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={status === "loading" || !code.trim()}
            className="rounded-xl bg-espresso px-4 py-2.5 text-xs font-semibold text-[var(--btn-fg)] disabled:opacity-60"
          >
            {status === "loading" ? "…" : "Apply"}
          </button>
        </div>
      )}
      {status === "invalid" && (
        <p className="mt-1.5 text-xs text-red-600">{message}</p>
      )}
    </div>
  );
}
