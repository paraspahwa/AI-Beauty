"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
      <main className="container max-w-2xl py-12 sm:py-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-stone">Loading...</p>
        </div>
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="container max-w-2xl py-12 sm:py-20 min-h-screen">
        <div className="mb-12">
          <span className="section-label mb-3 inline-flex">
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            AI Studio Canvas
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-4">
            Virtual Try-Ons Await
          </h1>
          <p className="text-ink-stone text-lg mb-8">
            Try makeup, hair, and clothing looks instantly. No commitment, no analysis—just fun.
          </p>
        </div>

        <div className="rounded-3xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(123,110,158,0.08))", border: "1px solid rgba(131,24,67,0.12)" }}>
          <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: "#EC4899" }} />
          <h2 className="font-serif text-2xl text-ink mb-3">Sign In to Get Started</h2>
          <p className="text-ink-stone mb-6">
            Log in to upload your photo and explore try-on possibilities. <strong>3 free generations per month.</strong>
          </p>

          <Button asChild variant="accent" size="lg">
            <Link href={`/auth?redirect=/studio`}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Link>
          </Button>

          <p className="text-xs text-ink-stone mt-6">
            Don&apos;t have an account? <Link href="/auth" className="underline hover:no-underline">Create one free</Link>
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: "💄", title: "Makeup Looks", desc: "Try 4 trending makeup styles" },
            { icon: "💇", title: "Hair Styles", desc: "Experiment with cuts & colors" },
            { icon: "👗", title: "Outfits", desc: "Build your capsule wardrobe" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl p-6 text-center" style={{ background: "rgba(251,231,242,0.5)", border: "1px solid rgba(131,24,67,0.12)" }}>
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="font-semibold text-ink mb-1">{item.title}</p>
              <p className="text-xs text-ink-stone">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // Logged in - show upload
  return (
    <main className="container max-w-2xl py-12 sm:py-20 min-h-screen">
      <div className="mb-12">
        <span className="section-label mb-3 inline-flex">
          <Sparkles className="h-3.5 w-3.5 mr-2" />
          AI Studio Canvas
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-4">
          Virtual Try-On Studio
        </h1>
        <p className="text-ink-stone text-lg mb-2">
          Upload your photo, explore looks, and download your favorites instantly.
        </p>
        <p className="text-sm" style={{ color: "#9C7D5B" }}>
          3 free generations per month · <Link href="/auth?plan=studio_pro" className="underline hover:no-underline" style={{ color: "#EC4899" }}>Upgrade to Studio Pro for unlimited</Link>
        </p>
      </div>

      {/* Upload Zone */}
      <div className="rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center mb-6" style={{ borderColor: "#E8DDD0", background: "rgba(255,247,251,0.5)" }}>
        <Upload className="h-12 w-12 mx-auto mb-4 opacity-30" />

        {preview ? (
          <div className="mb-6">
            <div className="relative inline-block rounded-2xl overflow-hidden" style={{ maxWidth: "300px" }}>
              <img src={preview} alt="Preview" className="w-full h-auto" />
            </div>
            <p className="text-sm text-ink-stone mt-4">{selectedFile?.name}</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-ink mb-2">Upload Your Photo</h2>
            <p className="text-ink-stone mb-6">
              Front-facing selfie works best for makeup & hair.<br />
              Full-body photo for outfit try-ons.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3 items-center">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <Button
              variant="accent"
              size="lg"
              asChild
              disabled={uploading}
            >
              <span>{uploading ? "Uploading..." : preview ? "Change Photo" : "Select Photo"}</span>
            </Button>
          </label>

          {preview && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              size="lg"
              style={{ background: "linear-gradient(135deg, #F97316, #EC4899)" }}
            >
              {uploading ? "Processing..." : "Start Try-On"}
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.12)" }}>
        <p className="text-sm font-semibold text-ink mb-3">💡 Tips for Best Results</p>
        <ul className="text-xs text-ink-stone space-y-2">
          <li>✦ Good lighting shows facial features clearly for makeup</li>
          <li>✦ Front-facing photos with visible hair work best for styling</li>
          <li>✦ Full-body standing photos let outfits drape naturally</li>
          <li>✦ Plain backgrounds reduce AI processing time</li>
        </ul>
      </div>

      {/* CTA: Get Full Analysis */}
      <div className="mt-12 rounded-3xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(201,149,107,0.1), rgba(123,110,158,0.1))", border: "1px solid rgba(131,24,67,0.12)" }}>
        <h2 className="font-serif text-2xl text-ink mb-3">Ready for Full Beauty Analysis?</h2>
        <p className="text-ink-stone mb-6">
          Get a complete report with face shape, color palette, skin routine, and personalized recommendations.
        </p>
        <Button asChild variant="accent" size="lg">
          <Link href="/upload">
            Unlock Full Analysis — ₹299
          </Link>
        </Button>
      </div>
    </main>
  );
}
