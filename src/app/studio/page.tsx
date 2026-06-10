"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, LogIn, Sparkles, ShieldCheck, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import styles from "./studio.module.css";
import { GuestStudioTry } from "@/components/studio/GuestStudioTry";
import { StudioExperienceCompare } from "@/components/studio/StudioExperienceCompare";
import { PRODUCT_COPY, STUDIO_EXPERIENCES } from "@/lib/product-copy";
import { STUDIO_PRO_CHECKOUT_PATH } from "@/lib/studio-pro-paths";

/**
 * AI Beauty Studio Canvas
 * 
 * Standalone try-on experience without full report analysis.
 * Free users: 3 gens/month
 * Paid users: 3 gens/month (separate quota)
 * Studio Pro: Unlimited
 */
export default function StudioPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const featureCards = [
    {
      title: "Makeup",
      icon: Wand2,
      text: "Try polished looks built for your face and lighting.",
    },
    {
      title: "Hair",
      icon: Camera,
      text: "Preview cuts and colors before you commit.",
    },
    {
      title: "Outfits",
      icon: Upload,
      text: "Generate complete looks with a clear source photo.",
    },
  ];

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("File must be smaller than 8MB");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/studio/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();

      // Navigate to studio session page
      router.push(`/studio/${data.canvasId}`);
    } catch (err) {
      setError((err as Error).message);
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <main className={`min-h-screen ${styles.pageBaseCompact}`}>
        <div className="container max-w-2xl py-24 sm:py-28 min-h-screen flex items-center justify-center">
          <div className={`rounded-3xl border px-6 py-5 text-center ${styles.loadingCard}`}>
            <p className="text-sm font-medium text-ink">Loading Studio Canvas…</p>
            <p className="mt-1 text-xs text-ink-stone">Preparing your workspace and checking session access.</p>
          </div>
        </div>
      </main>
    );
  }

  // Guest try-on — no auth required
  if (!user) {
    return (
      <main className={`min-h-screen ${styles.pageBase}`}>
        <div className="container max-w-6xl py-10 sm:py-16">
          <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <span className="section-label inline-flex">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {PRODUCT_COPY.primaryCta}
              </span>
              <div className="space-y-4">
                <h1 className="max-w-xl font-sans text-4xl leading-tight text-ink sm:text-5xl">
                  See a new look on your face in seconds.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-ink-stone">
                  Upload a selfie, pick a preset or tap Surprise Me. Sign in later to save looks and unlock your full Style DNA.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" size="lg">
                  <Link href="/upload">
                    {PRODUCT_COPY.secondaryCta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/auth?redirect=/studio">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in to save
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {featureCards.map((item) => (
                  <div key={item.title} className={`rounded-2xl border p-4 ${styles.softCard}`}>
                    <item.icon className="h-4 w-4 text-[#111827]" />
                    <p className="mt-3 text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-stone">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-ink-stone">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Private uploads</span>
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> 3 free generations / month</span>
                <span className="flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" /> Studio Pro unlocks unlimited</span>
              </div>
            </div>

            <div className={`rounded-[2rem] border p-5 sm:p-6 shadow-[0_24px_60px_rgba(17,24,39,0.10)] ${styles.surfaceCard}`}>
              <GuestStudioTry />
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Fast", desc: "No report setup needed before you try looks." },
              { title: "Reusable", desc: "Use one upload as the source for multiple generations." },
              { title: "Premium-ready", desc: "Upgrade path stays visible without getting in the way." },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border px-4 py-4 ${styles.softCard}`}>
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-stone">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <StudioExperienceCompare variant="compact" highlight="quick" />
          </div>
        </div>
      </main>
    );
  }

  // Logged in - show upload
  return (
    <main className={`min-h-screen ${styles.pageBaseCompact}`}>
      <div className="container max-w-6xl py-8 sm:py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="section-label mb-3 inline-flex">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {STUDIO_EXPERIENCES.quickTry.name}
            </span>
            <h1 className="font-sans text-3xl sm:text-4xl text-ink">{STUDIO_EXPERIENCES.quickTry.name}</h1>
            <p className="mt-2 max-w-2xl text-base sm:text-lg text-ink-stone">
              {STUDIO_EXPERIENCES.quickTry.tagline}
            </p>
          </div>
          <p className={`text-sm ${styles.textMuted}`}>
            3 free generations per month · <Link href={STUDIO_PRO_CHECKOUT_PATH} className="underline hover:no-underline text-[#111827]">Upgrade to Studio Pro for unlimited</Link>
          </p>
        </div>

        <div className="mb-8">
          <StudioExperienceCompare variant="full" highlight="quick" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={`rounded-[2rem] border p-5 sm:p-6 ${styles.surfaceCard}`}>
            <div className={`rounded-[1.5rem] border-2 border-dashed p-6 sm:p-8 text-center ${styles.uploadCard}`}>
              <Upload className="mx-auto mb-4 h-12 w-12 opacity-30" />

              {preview ? (
                <div className="mb-6">
                  <div className={`relative mx-auto inline-block overflow-hidden rounded-2xl ${styles.previewFrame}`}>
                    <Image
                      src={preview}
                      alt="Preview"
                      width={320}
                      height={420}
                      unoptimized
                      className="h-auto w-full"
                    />
                  </div>
                  <p className="mt-4 text-sm text-ink-stone">{selectedFile?.name}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["Natural glow", "Evening glam", "New hair"].map((label) => (
                      <span
                        key={label}
                        className="rounded-full px-3 py-1.5 text-xs font-medium"
                        style={{ background: "rgba(17,24,39,0.08)", color: "#3D2B1F" }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-xs text-ink-stone">Quick presets ready — start try-on to explore</p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-ink mb-2">Upload your photo</h2>
                  <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-ink-stone">
                    Front-facing selfie works best for makeup and hair. Use a full-body photo for outfit try-ons.
                  </p>
                </>
              )}

              <div className="flex flex-col items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button variant="accent" size="lg" asChild disabled={uploading}>
                    <span>{uploading ? "Uploading..." : preview ? "Change Photo" : "Select Photo"}</span>
                  </Button>
                </label>

                {preview && (
                  <Button onClick={handleUpload} disabled={uploading} size="lg" className="bg-[#111827] text-white hover:bg-[#111827]/95">
                    {uploading ? "Processing..." : "Start Try-On"}
                  </Button>
                )}
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-[2rem] border p-5 sm:p-6 ${styles.surfaceCard}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink">How it works</p>
              <div className="mt-4 space-y-3">
                {[
                  "Upload once and reuse the same source photo.",
                  "Try makeup, hair, and outfits from one workspace.",
                  "Save clean generations back into your vault.",
                ].map((step, index) => (
                  <div key={step} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${styles.inlinePanel}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.stepBubble}`}>
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-stone">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[2rem] border p-5 sm:p-6 ${styles.surfaceCard}`}>
              <p className="text-sm font-semibold text-ink mb-3">Best results</p>
              <ul className="space-y-2 text-sm text-ink-stone">
                <li>• Good lighting keeps facial details crisp.</li>
                <li>• Visible hair helps styling look realistic.</li>
                <li>• Plain backgrounds make editing cleaner.</li>
                <li>• Full-body shots give better outfit drape.</li>
              </ul>
            </div>

            <div className={`rounded-[2rem] border p-5 sm:p-6 ${styles.heroCard}`}>
              <h2 className="font-sans text-2xl text-ink mb-2">Ready for full beauty analysis?</h2>
              <p className="text-sm leading-relaxed text-ink-stone mb-5">
                Get face shape, color palette, skin routine, and personalized recommendations in one report.
              </p>
              <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
                <Link href="/upload">
                  Unlock Full Analysis — ₹299
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
