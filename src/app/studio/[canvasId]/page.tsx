import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCanvasQuota } from "@/lib/entitlement";
import { CanvasStudio } from "@/components/studio/CanvasStudio";
import { CanvasShareButton } from "@/components/studio/CanvasShareButton";
import type { StudioEntitlement } from "@/types/report";

/**
 * Studio Canvas Session Page
 * 
 * Display try-on interface for a canvas (standalone studio session).
 * User must own the canvas and have remaining quota.
 */
export default async function StudioSessionPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = await params;

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
    <main className="min-h-screen" style={{ background: "linear-gradient(to bottom, #FDF2F8, #FEFBF8)" }}>
      <div className="container max-w-4xl py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <span className="section-label mb-2 inline-flex text-xs">Studio Canvas</span>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">Virtual Try-On Studio</h1>
          <p className="text-ink-stone text-sm mt-2">
            Canvas created {new Date(canvas.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="mb-6">
          <CanvasShareButton
            canvasId={canvasId}
            initialShareUrl={null}
          />
        </div>

        {/* Quota Banner */}
        {quota.remaining !== null && (
          <div
            className="mb-6 rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{
              background:
                quota.remaining <= 1
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(16,185,129,0.08)",
              border:
                quota.remaining <= 1
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{
                color: quota.remaining <= 1 ? "#DC2626" : "#059669",
              }}
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
                <a href="/auth?plan=studio_pro" className="underline text-pink-600">
                  Upgrade for unlimited
                </a>
              </p>
            )}
          </div>
        )}

        {/* Try-On Component */}
        <CanvasStudio
          canvasId={canvasId}
          photoUrl={signed?.signedUrl ?? ""}
          studioEntitlement={studioEntitlement}
          initialSourceAssetId={null}
        />
      </div>
    </main>
  );
}
