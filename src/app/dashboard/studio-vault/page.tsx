import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StudioVaultGallery } from "@/components/studio/StudioVaultGallery";
import { PRODUCT_COPY } from "@/lib/product-copy";
import { STUDIO_PRO_CHECKOUT_PATH } from "@/lib/studio-pro-paths";

export default async function StudioVaultPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirect=/dashboard/studio-vault");
  }

  const { data: assets } = await supabase
    .from("generated_assets")
    .select("id, studio_canvas_id, report_id, tool, result_image_path, created_at, meta, variant")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const admin = createSupabaseAdminClient();
  const signedAssets = await Promise.all((assets ?? []).map(async (asset) => {
    const { data } = await admin.storage.from(env.supabase.bucket).createSignedUrl(asset.result_image_path, 60 * 60 * 24);
    const meta = asset.meta as { sourceImageUrl?: string; source_image_path?: string } | null;
    let sourceImageUrl = meta?.sourceImageUrl ?? null;
    if (!sourceImageUrl && meta?.source_image_path) {
      const { data: src } = await admin.storage.from(env.supabase.bucket).createSignedUrl(meta.source_image_path, 60 * 60 * 24);
      sourceImageUrl = src?.signedUrl ?? null;
    }
    return {
      ...asset,
      imageUrl: data?.signedUrl ?? null,
      meta: { ...meta, sourceImageUrl: sourceImageUrl ?? undefined },
    };
  }));

  return (
    <main className="container max-w-6xl py-12 sm:py-20 min-h-screen">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="font-sans text-3xl sm:text-4xl text-ink">{PRODUCT_COPY.myLooks}</h1>
          <p className="text-ink-stone text-sm mt-1">{signedAssets.length} saved moments</p>
        </div>
      </div>

      <StudioVaultGallery assets={signedAssets} />

      <div className="mt-12 rounded-3xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.1), rgba(17,24,39,0.1))", border: "1px solid rgba(17,24,39,0.12)" }}>
        <h2 className="font-sans text-2xl text-ink mb-3">Want more try-ons?</h2>
        <p className="text-ink-stone mb-6">
          Studio Pro subscribers get {PRODUCT_COPY.studioPro.studioGensPerMonth} AI generations per month. Free users get {PRODUCT_COPY.free.studioGensPerMonth} per month.
        </p>
        <Button asChild variant="accent" size="lg">
          <Link href={STUDIO_PRO_CHECKOUT_PATH}>Upgrade to Studio Pro</Link>
        </Button>
      </div>
    </main>
  );
}
