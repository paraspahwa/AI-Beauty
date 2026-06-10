"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterReveal } from "@/components/BeforeAfterReveal";
import { StyleMomentShare } from "@/components/StyleMomentShare";
import { TryTheseNext, type TryNextPreset } from "@/components/TryTheseNext";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import { PRODUCT_COPY } from "@/lib/product-copy";
import { guestShare, type UnlockTeaser } from "@/lib/progressive-unlock";
import { track } from "@/lib/track";
import { formatApiError, errorMessageFromUnknown } from "@/lib/api-errors";

const COACH_MARK_KEY = "rv_studio_coach_seen";

const PRESETS: TryNextPreset[] = [
  { id: "natural", label: "Natural glow", mode: "makeup", variant: "natural" },
  { id: "glam", label: "Evening glam", mode: "makeup", variant: "glamorous" },
  { id: "hair", label: "New hair color", mode: "hair", variant: "hair" },
  { id: "blonde", label: "Soft blonde", mode: "hair", variant: "blonde" },
];

export function GuestStudioTry() {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState<number>(PRODUCT_COPY.free.studioGensPerMonth);
  const [teaser, setTeaser] = React.useState<UnlockTeaser | null>(null);
  const [showCoach, setShowCoach] = React.useState(false);
  const [pendingPreset, setPendingPreset] = React.useState<TryNextPreset | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      if (!localStorage.getItem(COACH_MARK_KEY)) setShowCoach(true);
    } catch {
      // ignore
    }
  }, []);

  function dismissCoach() {
    setShowCoach(false);
    try {
      localStorage.setItem(COACH_MARK_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/studio/guest-upload", { method: "POST", body: form });
      const json = await res.json() as { photoUrl?: string; error?: string; remaining?: number };
      if (!res.ok) throw new Error(formatApiError(json.error, "Upload failed"));
      setPhotoUrl(json.photoUrl ?? null);
      setResultUrl(null);
      if (typeof json.remaining === "number") setRemaining(json.remaining);
      track("guest_upload");
      dismissCoach();
      if (pendingPreset) {
        const preset = pendingPreset;
        setPendingPreset(null);
        void generate(preset);
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setUploading(false);
    }
  }

  async function generate(preset: TryNextPreset) {
    if (!photoUrl) return;
    if (remaining <= 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/guest-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: preset.mode,
          makeupStyle: preset.mode === "makeup" ? preset.variant : undefined,
          hairVariant: preset.mode === "hair" ? preset.variant : undefined,
        }),
      });
      const json = await res.json() as {
        lowResUrl?: string;
        error?: string;
        remaining?: number;
        requiresAuth?: boolean;
        teaser?: UnlockTeaser;
      };
      if (!res.ok) throw new Error(formatApiError(json.error, "Generation failed"));
      setResultUrl(json.lowResUrl ?? null);
      if (json.teaser && json.teaser.type !== "none") setTeaser(json.teaser);
      track("tryon", { guest: true });
      if (typeof json.remaining === "number") setRemaining(json.remaining);
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setGenerating(false);
    }
  }

  function surpriseMe() {
    if (remaining <= 0 || !photoUrl) return;
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    void generate(preset);
  }

  function handlePresetSelect(preset: TryNextPreset) {
    if (!photoUrl) {
      setPendingPreset(preset);
      fileInputRef.current?.click();
      return;
    }
    if (remaining <= 0) return;
    void generate(preset);
  }

  function resetPhoto() {
    setPhotoUrl(null);
    setResultUrl(null);
    setError(null);
    setPendingPreset(null);
  }

  const quotaExhausted = remaining <= 0;

  return (
    <div className="relative space-y-6">
      {showCoach ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl p-6"
          style={{ background: "rgba(17,24,39,0.55)" }}
        >
          <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="text-sm font-semibold text-[#3D2B1F]">Quick start</p>
            <p className="mt-2 text-sm leading-relaxed text-[#6B5344]">
              Upload → tap <strong>Surprise Me</strong> → drag to compare your before &amp; after.
            </p>
            <Button type="button" variant="accent" size="sm" className="mt-4" onClick={dismissCoach}>
              Got it
            </Button>
          </div>
        </div>
      ) : null}

      {/* Preset vibe cards — visible before upload */}
      {!photoUrl ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              disabled={uploading}
              className="rounded-2xl border border-dashed border-[#E8DDD0] bg-[#FAF6F0]/60 px-3 py-4 text-center transition-colors hover:border-[#C8A96E] disabled:opacity-50"
            >
              <Sparkles className="mx-auto h-4 w-4 text-[#C8A96E]" />
              <p className="mt-2 text-xs font-medium text-[#3D2B1F]">{preset.label}</p>
            </button>
          ))}
        </div>
      ) : null}

      {!photoUrl ? (
        <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#E8DDD0] bg-[#FAF6F0] p-8 text-center transition-colors hover:border-[#C8A96E]">
          <Upload className="h-8 w-8 text-[#C8A96E]" />
          <p className="text-sm font-medium text-[#3D2B1F]">Upload a selfie to try a look free</p>
          <p className="text-xs text-[#9C7D5B]">No account needed · {PRODUCT_COPY.free.studioGensPerMonth} free try-ons</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-[#C8A96E]" /> : null}
        </label>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#6B5344]">
              {quotaExhausted ? "No free try-ons left" : `${remaining} free try-ons left`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetPhoto}>
                <Camera className="h-4 w-4" />
                Change photo
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => void surpriseMe()}
                disabled={generating || quotaExhausted}
              >
                <Sparkles className="h-4 w-4" />
                Surprise Me
              </Button>
            </div>
          </div>
          {resultUrl ? (
            <BeforeAfterReveal beforeUrl={photoUrl} afterUrl={resultUrl} />
          ) : (
            <div className="relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-2xl">
              <Image src={photoUrl} alt="Your selfie" fill unoptimized className="object-cover" />
            </div>
          )}
          {resultUrl ? (
            <>
              <StyleMomentShare
                beforeUrl={photoUrl}
                afterUrl={resultUrl}
                guest
                onShared={() => {
                  const { teaser: t } = guestShare();
                  setTeaser(t);
                }}
              />
              <UnlockTeaserBanner guest teaser={teaser} />
            </>
          ) : null}
          <TryTheseNext
            presets={PRESETS}
            onSelect={handlePresetSelect}
            loading={generating}
            disabled={quotaExhausted}
          />
          {quotaExhausted ? (
            <div className="rounded-2xl border border-[#E8DDD0] bg-white p-5 text-center">
              <p className="text-sm font-semibold text-[#3D2B1F]">Love your look? Save it to My Looks</p>
              <p className="mt-1 text-xs text-[#9C7D5B]">Sign in for 3 more try-ons and your saved gallery.</p>
              <Button asChild variant="accent" size="sm" className="mt-3">
                <Link href="/auth?redirect=/studio">Sign in free</Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p className="flex items-center gap-2 text-sm text-[#C06B3E]">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
      {generating ? (
        <p className="flex items-center gap-2 text-sm text-[#9C7D5B]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating your look…
        </p>
      ) : null}
    </div>
  );
}
