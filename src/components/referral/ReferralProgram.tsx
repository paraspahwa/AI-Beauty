"use client";

import * as React from "react";
import { Gift, Share2, Copy, Check, Users, Ticket } from "lucide-react";
import { track } from "@/lib/track";

interface ReferralData {
  referralCode: string | null;
  credits: number;
  referredBy: string | null;
  redemptions: { status: string; createdAt: string; completedAt: string | null }[];
}

export function ReferralProgram({ className = "" }: { className?: string }) {
  const [data, setData] = React.useState<ReferralData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [referralLink, setReferralLink] = React.useState("");

  React.useEffect(() => {
    const origin = window.location.origin;
    void fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.referralCode) {
          setReferralLink(`${origin}/auth?ref=${d.referralCode}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      track("copy_referral_link");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: "Renovaara - AI Beauty Analysis",
        text: `Discover your color season and beauty profile! Use my referral link: ${referralLink}`,
        url: referralLink,
      });
      track("share_referral", { platform: "native" });
    } catch {
      // user cancelled
    }
  }

  if (loading) {
    return (
      <div className={`rounded-2xl border border-terracotta/10 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-terracotta/10" />
          <div className="h-4 w-40 animate-pulse rounded bg-terracotta/10" />
        </div>
      </div>
    );
  }

  if (!data?.referralCode) return null;

  const completedReferrals = data.redemptions.filter((r) => r.status === "completed").length;
  const pendingReferrals = data.redemptions.filter((r) => r.status === "pending").length;

  return (
    <div className={`rounded-2xl border border-terracotta/10 bg-blush/30 p-6 sm:p-8 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-espresso text-[var(--btn-fg)]">
          <Gift className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-lg text-ink">Refer a Friend</h3>
          <p className="text-xs text-ink-stone">
            You earn ₹50 when they unlock their report. They get ₹50 off.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 flex gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-terracotta/10 bg-[var(--report-photo-bg)] px-4 py-3">
          <Users className="h-4 w-4 text-terracotta" />
          <div>
            <p className="text-lg font-bold text-ink">{completedReferrals}</p>
            <p className="text-[11px] text-ink-stone">Referred</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-terracotta/10 bg-[var(--report-photo-bg)] px-4 py-3">
          <Ticket className="h-4 w-4 text-terracotta" />
          <div>
            <p className="text-lg font-bold text-ink">₹{data.credits}</p>
            <p className="text-[11px] text-ink-stone">Credits earned</p>
          </div>
        </div>
        {pendingReferrals > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
            <Users className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{pendingReferrals}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Pending</p>
            </div>
          </div>
        )}
      </div>

      {/* Referral link */}
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-ink-stone">Your referral link</label>
        <div className="flex gap-2">
          <div className="flex-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--report-photo-bg)] px-4 py-2.5 text-xs text-ink font-mono truncate">
            {referralLink}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-espresso px-4 py-2.5 text-xs font-semibold text-[var(--btn-fg)]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-terracotta/20 bg-terracotta/10 px-4 py-2.5 text-xs font-semibold text-terracotta"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          )}
        </div>
      </div>

      {data.referredBy && (
        <p className="mt-3 text-xs text-ink-mist">
          You were referred by {data.referredBy}. Refer friends to earn credits too!
        </p>
      )}
    </div>
  );
}
