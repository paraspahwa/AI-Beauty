import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hasPremiumAccess } from "@/lib/auth/access";
import { ReportLayout } from "@/components/report/ReportLayout";
import type { CompiledReport, ReportVisualAssets } from "@/types/report";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rich OG metadata so shared links look great on social */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!UUID_RE.test(token)) return {};

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("reports")
    .select("face_shape, color_analysis, summary")
    .eq("share_token", token)
    .eq("status", "ready")
    .single();

  if (!row) return {};

  const faceShape = (row.face_shape as { shape?: string } | null)?.shape;
  const season = (row.color_analysis as { season?: string } | null)?.season;
  const title = [faceShape ? `${faceShape} Face` : null, season ?? null]
    .filter(Boolean)
    .join(" · ") || "Beauty Profile";

  const description =
    (row.summary as string | null) ??
    "A personalized AI beauty analysis — face shape, color season, skincare, hairstyle & spectacles.";

  const imageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/og/${token}`;

  return {
    title: `${title} — StyleAI`,
    description,
    openGraph: {
      title: `${title} — StyleAI`,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "StyleAI beauty report" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — StyleAI`,
      description,
      images: [imageUrl],
    },
  };
}

function parseVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const admin = createSupabaseAdminClient();

  const { data: row } = await admin
    .from("reports")
    .select("*")
    .eq("share_token", token)
    .eq("status", "ready")
    .single();

  if (!row) notFound();

  // Generate a signed URL for the selfie (30-min TTL)
  const { data: signed } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  // Resolve visual assets and sign their URLs
  let visualAssets: ReportVisualAssets | undefined = parseVisualAssets(row.visual_assets);

  if (!visualAssets) {
    const { data: rec } = await admin
      .from("recommendations")
      .select("data")
      .eq("report_id", row.id)
      .eq("category", "visual_assets")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    visualAssets = parseVisualAssets(rec?.data);
  }

  if (visualAssets) {
    const sign = (path: string) =>
      admin.storage.from(visualAssets!.bucket).createSignedUrl(path, 60 * 30);

    if (visualAssets.assets.landmarkOverlay?.path && visualAssets.assets.landmarkOverlay.status === "ready") {
      const { data } = await sign(visualAssets.assets.landmarkOverlay.path);
      visualAssets.assets.landmarkOverlay.signedUrl = data?.signedUrl;
    }
    if (visualAssets.assets.paletteBoard?.path && visualAssets.assets.paletteBoard.status === "ready") {
      const { data } = await sign(visualAssets.assets.paletteBoard.path);
      visualAssets.assets.paletteBoard.signedUrl = data?.signedUrl;
    }
    if (visualAssets.assets.glassesPreviews) {
      visualAssets.assets.glassesPreviews = await Promise.all(
        visualAssets.assets.glassesPreviews.map(async (a) => {
          if (a.path && a.status === "ready") {
            const { data } = await sign(a.path);
            return { ...a, signedUrl: data?.signedUrl };
          }
          return a;
        }),
      );
    }
    if (visualAssets.assets.hairstylePreviews) {
      visualAssets.assets.hairstylePreviews = await Promise.all(
        visualAssets.assets.hairstylePreviews.map(async (a) => {
          if (a.path && a.status === "ready") {
            const { data } = await sign(a.path);
            return { ...a, signedUrl: data?.signedUrl };
          }
          return a;
        }),
      );
    }
  }

  // Premium access is based solely on payment status (no email check for public views)
  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: undefined });

  const report: CompiledReport = {
    id: row.id,
    userId: row.user_id,
    imageUrl: signed?.signedUrl ?? "",
    status: "ready",
    isPaid: hasPremium,
    shareToken: token,
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: row.color_analysis ?? undefined,
    skinAnalysis: hasPremium ? row.skin_analysis ?? undefined : undefined,
    features: hasPremium ? row.features ?? undefined : undefined,
    glasses: hasPremium ? row.glasses ?? undefined : undefined,
    hairstyle: hasPremium ? row.hairstyle ?? undefined : undefined,
    visualAssets,
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
  };

  return (
    <main>
      <div className="border-b text-center py-2 text-xs text-ink-stone"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        This is a shared StyleAI beauty report.{" "}
        <Link href="/" className="underline underline-offset-2 hover:opacity-80">
          Get your own →
        </Link>
      </div>
      <ReportLayout report={report} isReadOnly />
    </main>
  );
}
