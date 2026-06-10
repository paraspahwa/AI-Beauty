import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { parseMomentToken } from "@/lib/moment-share";
import { BeforeAfterReveal } from "@/components/BeforeAfterReveal";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token: rawToken } = await params;
  const payload = parseMomentToken(decodeURIComponent(rawToken));
  if (!payload) return { title: "Shared Look — Renovaara" };

  const ogImageUrl = `${env.app.url}/api/og/moment/${encodeURIComponent(rawToken)}`;
  const title = payload.caption ?? "Shared Look";
  const description = "See the before and after — try your next look free in Renovaara AI Studio.";

  return {
    title: `${title} — Renovaara`,
    description,
    openGraph: {
      title: `${title} — Renovaara`,
      description,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Renovaara before and after look" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Renovaara`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function MomentSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const payload = parseMomentToken(token);
  if (!payload) notFound();

  const admin = createSupabaseAdminClient();
  const bucket = env.supabase.bucket;

  const [{ data: beforeSigned }, { data: afterSigned }] = await Promise.all([
    admin.storage.from(bucket).createSignedUrl(payload.b, 60 * 60),
    admin.storage.from(bucket).createSignedUrl(payload.a, 60 * 60),
  ]);

  if (!beforeSigned?.signedUrl || !afterSigned?.signedUrl) notFound();

  return (
    <main className="min-h-screen py-10 sm:py-16" style={{ background: "linear-gradient(to bottom, #fffafc, #fffafc)" }}>
      <div className="container max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="section-label mb-2 inline-flex text-xs">Shared Look</span>
            <h1 className="font-sans text-3xl sm:text-4xl text-ink">{payload.caption ?? "Made with Renovaara"}</h1>
            <p className="text-ink-stone text-sm mt-2">Drag to compare the transformation.</p>
          </div>
          <Button asChild variant="accent">
            <Link href="/studio">Try your own look free</Link>
          </Button>
        </div>

        <div className="rounded-3xl overflow-hidden border p-4 sm:p-6" style={{ borderColor: "rgba(17,24,39,0.12)", background: "rgba(255,255,255,0.85)" }}>
          <BeforeAfterReveal
            beforeUrl={beforeSigned.signedUrl}
            afterUrl={afterSigned.signedUrl}
            className="w-full max-w-xl mx-auto"
          />
        </div>

        <p className="mt-8 text-center text-sm text-ink-stone">
          Start with 3 free try-ons per month — no card required.{" "}
          <Link href="/studio" className="font-semibold text-ink underline-offset-2 hover:underline">
            Open AI Studio
          </Link>
        </p>
      </div>
    </main>
  );
}
