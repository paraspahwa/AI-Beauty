import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCanvasQuota } from "@/lib/entitlement";
import { detectFaceDetails } from "@/lib/ai/rekognition";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import { CanvasStudio } from "@/components/studio/CanvasStudio";
import { AdvancedStudioPromo } from "@/components/studio/StudioExperienceCompare";
import { AIBeautyStudio } from "@/components/report/AIBeautyStudio";
import { CanvasShareButton } from "@/components/studio/CanvasShareButton";
import { STUDIO_EXPERIENCES } from "@/lib/product-copy";
import { STUDIO_PRO_CHECKOUT_PATH } from "@/lib/studio-pro-paths";
import type { StudioEntitlement } from "@/types/report";
import styles from "../studio.module.css";

/**
 * Studio Canvas Session Page
 * 
 * Display try-on interface for a canvas (standalone studio session).
 * User must own the canvas and have remaining quota.
 */
export default async function StudioSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ canvasId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { canvasId } = await params;
  const sp = searchParams ? await searchParams : {};
  const advanced = sp.advanced === "1" || sp.advanced === "true";

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?redirect=/studio/${canvasId}`);
  }

  // Fetch canvas
  const { data: canvas } = await supabase
    .from("studio_canvases")
    .select("id, user_id, selfie_path, color_palette, created_at")
    .eq("id", canvasId)
    .single();

  if (!canvas) {
    notFound();
  }

  // Verify ownership
  if (canvas.user_id !== user.id) {
    notFound();
  }

  // Sign photo URL
  const admin = createSupabaseAdminClient();
  const { data: signed } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(canvas.selfie_path, 60 * 60 * 24); // 24h

  // Best-effort Rekognition gender detection for hairstyle option filtering.
  let detectedGender: "none" | "male" | "female" = "none";
  try {
    const { data: selfieData, error: selfieErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(canvas.selfie_path);
    if (!selfieErr && selfieData) {
      const face = await detectFaceDetails(Buffer.from(await selfieData.arrayBuffer()));
      detectedGender = normalizeRekognitionGender(face);
    }
  } catch (err) {
    console.warn("[studio/page] Rekognition gender detection skipped:", (err as Error).message);
  }

  // Get quota
  const quota = await getCanvasQuota(user.id);

  // Convert quota to StudioEntitlement shape for AIBeautyStudio component
  const studioEntitlement: StudioEntitlement = {
    tier: quota.tier,
    remainingGens: quota.tier === "studio_pro" ? 999 : quota.remaining,
    usedGens: quota.used,
    cap: quota.tier === "studio_pro" ? 999 : quota.limit,
    periodResets: quota.periodResets,
    subscriptionId: null,
  };

  return (
    <main className={`min-h-screen ${styles.pageBaseCompact}`}>
      <div className="container max-w-4xl py-8 sm:py-12">
        <div className={`mb-8 rounded-[2rem] border px-5 py-5 sm:px-6 sm:py-6 ${styles.surfaceCard}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-label mb-2 inline-flex text-xs">Studio Canvas</span>
              <h1 className="font-sans text-2xl sm:text-3xl text-ink">
                {advanced ? STUDIO_EXPERIENCES.advancedStudio.name : STUDIO_EXPERIENCES.quickTry.name}
              </h1>
              <p className="text-ink-stone text-sm mt-2">
                {advanced
                  ? STUDIO_EXPERIENCES.advancedStudio.tagline
                  : STUDIO_EXPERIENCES.canvasSessionHint}
              </p>
              <p className="text-ink-stone text-xs mt-1">
                Canvas created {new Date(canvas.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <CanvasShareButton
                canvasId={canvasId}
                initialShareUrl={null}
              />
            </div>
          </div>
        </div>

        {/* Quota Banner */}
        {quota.remaining !== null && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 flex items-center justify-between ${quota.remaining <= 1 ? styles.quotaWarn : styles.quotaGood}`}
          >
            <p
              className={`text-sm font-semibold ${quota.remaining <= 1 ? styles.quotaWarnText : styles.quotaGoodText}`}
            >
              {quota.tier === "studio_pro" ? (
                <>✨ Studio Pro — Unlimited Generations</>
              ) : (
                <>
                  {quota.remaining} free generation{quota.remaining !== 1 ? "s" : ""} left this month
                </>
              )}
            </p>
            {quota.remaining <= 0 && quota.tier !== "studio_pro" && (
              <p className="text-xs text-ink-stone">
                <a href={STUDIO_PRO_CHECKOUT_PATH} className="underline text-pink-600">
                  Upgrade for unlimited
                </a>
              </p>
            )}
          </div>
        )}

        {advanced ? (
          <AIBeautyStudio
            contextType="canvas"
            contextId={canvasId}
            photoUrl={signed?.signedUrl ?? ""}
            isPaid={true}
            detectedGender={detectedGender}
            studioEntitlement={studioEntitlement}
            initialSourceAssetId={null}
          />
        ) : (
          <>
            <CanvasStudio
              canvasId={canvasId}
              photoUrl={signed?.signedUrl ?? ""}
              detectedGender={detectedGender}
              studioEntitlement={studioEntitlement}
              initialSourceAssetId={null}
            />
            <AdvancedStudioPromo canvasId={canvasId} />
          </>
        )}
      </div>
    </main>
  );
}
