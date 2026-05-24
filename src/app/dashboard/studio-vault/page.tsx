import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

/**
 * Studio Vault Page
 * 
 * Gallery of all generated assets (canvas + report studio creations).
 */
export default async function StudioVaultPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirect=/dashboard/studio-vault");
  }

  // Fetch all generated assets for user
  const { data: assets } = await supabase
    .from("generated_assets")
    .select("id, studio_canvas_id, report_id, tool, result_image_path, created_at, meta, variant")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const admin = createSupabaseAdminClient();
  const signedAssets = await Promise.all((assets ?? []).map(async (asset) => {
    const { data } = await admin.storage.from(env.supabase.bucket).createSignedUrl(asset.result_image_path, 60 * 60 * 24);
    return { ...asset, imageUrl: data?.signedUrl ?? null };
  }));

  const groupedAssets = {
    canvas: signedAssets.filter((a) => !!a.studio_canvas_id),
    report: signedAssets.filter((a) => !!a.report_id),
  };

  const allAssets = signedAssets;

  return (
    <main className="container max-w-6xl py-12 sm:py-20 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="font-sans text-3xl sm:text-4xl text-ink">Studio Vault</h1>
          <p className="text-ink-stone text-sm mt-1">{allAssets.length} generated creations</p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="mb-8 flex gap-2">
        {[
          { label: "All", count: allAssets.length },
          { label: "Canvas", count: groupedAssets.canvas.length },
          { label: "Reports", count: groupedAssets.report.length },
        ].map((tab) => (
          <button
            key={tab.label}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: "rgba(251,231,242,0.5)",
              border: "1px solid rgba(17,24,39,0.14)",
              color: "#3D2B1F",
            }}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-2 text-xs opacity-60">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Gallery */}
      {allAssets.length === 0 ? (
        <div className="rounded-3xl p-12 text-center" style={{ background: "rgba(251,231,242,0.5)", border: "1px dashed rgba(17,24,39,0.14)" }}>
          <p className="text-ink-stone mb-4">No generated assets yet.</p>
          <div className="space-y-2">
            <p className="text-sm text-ink-stone">
              <Link href="/studio" className="underline text-pink-600">
                Try Studio Canvas
              </Link>
              {" "}or{" "}
              <Link href="/upload" className="underline text-pink-600">
                Generate a full report
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAssets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-2xl overflow-hidden bg-white border"
              style={{ borderColor: "#E8DDD0" }}
            >
              <div className="aspect-square bg-gray-100">
                {asset.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.imageUrl} alt={asset.tool} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-ink-stone">Image: {asset.id.slice(0, 8)}</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
                      {asset.tool}
                    </p>
                    <p className="text-xs text-ink-stone mt-1">
                      {new Date(asset.created_at).toLocaleDateString("en-IN")}
                    </p>
                    {asset.variant && <p className="text-[11px] text-ink-stone mt-1">{asset.variant}</p>}
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: asset.studio_canvas_id ? "rgba(17,24,39,0.08)" : "rgba(17,24,39,0.08)",
                      color: asset.studio_canvas_id ? "#111827" : "#111827",
                    }}
                  >
                    {asset.studio_canvas_id ? "Canvas" : "Report"}
                  </span>
                </div>

                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  style={{ color: "#111827" }}
                >
                  <a href={asset.imageUrl ?? "#"} download={!!asset.imageUrl}>
                    <Download className="h-3 w-3 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-3xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.1), rgba(17,24,39,0.1))", border: "1px solid rgba(17,24,39,0.12)" }}>
        <h2 className="font-sans text-2xl text-ink mb-3">Want More Try-Ons?</h2>
        <p className="text-ink-stone mb-6">
          Studio Pro subscribers get 150 AI generations per month. All other users get 3 free per month.
        </p>
        <Button asChild variant="accent" size="lg">
          <Link href="/auth?plan=studio_pro">Upgrade to Studio Pro</Link>
        </Button>
      </div>
    </main>
  );
}
