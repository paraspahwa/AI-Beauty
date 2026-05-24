import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return UUID_RE.test(token) ? { title: "Shared Canvas — Renovaara" } : { title: "Canvas — Renovaara" };
}

export default async function CanvasSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const admin = createSupabaseAdminClient();
  const { data: canvas } = await admin
    .from("studio_canvases")
    .select("id, user_id, selfie_path, color_palette, created_at")
    .eq("share_token", token)
    .single();
  if (!canvas) notFound();

  const { data: selfie } = await admin.storage.from(env.supabase.bucket).createSignedUrl(canvas.selfie_path, 60 * 60 * 24);

  const { data: recent } = await admin
    .from("generated_assets")
    .select("id, tool, variant, result_image_path, created_at")
    .eq("studio_canvas_id", canvas.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const recentSigned = await Promise.all((recent ?? []).map(async (asset) => {
    const { data } = await admin.storage.from(env.supabase.bucket).createSignedUrl(asset.result_image_path, 60 * 60 * 24);
    return { ...asset, imageUrl: data?.signedUrl ?? null };
  }));

  const colorPalette = canvas.color_palette as
    | { season?: string; palette?: { name: string; hex: string }[] }
    | { palette?: { name: string; hex: string }[] }
    | { name: string; hex: string }[]
    | null;
  const paletteItems = Array.isArray(colorPalette)
    ? colorPalette
    : (colorPalette?.palette ?? []);
  const paletteSeason = !Array.isArray(colorPalette) && colorPalette && "season" in colorPalette
    ? colorPalette.season ?? null
    : null;

  return (
    <main className="min-h-screen py-10 sm:py-16" style={{ background: "linear-gradient(to bottom, #fffafc, #fffafc)" }}>
      <div className="container max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <span className="section-label mb-2 inline-flex">Shared Studio Canvas</span>
            <h1 className="font-sans text-3xl sm:text-4xl text-ink">A Canvas Session</h1>
            <p className="text-ink-stone text-sm mt-2">Generated on {new Date(canvas.created_at).toLocaleDateString("en-IN")}</p>
          </div>
          <Button asChild variant="accent">
            <Link href="/studio">Try your own</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl overflow-hidden border" style={{ borderColor: "rgba(17,24,39,0.14)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfie?.signedUrl ?? ""} alt="Shared canvas selfie" className="w-full h-auto" />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl p-6" style={{ background: "rgba(255,247,251,0.85)", border: "1px solid rgba(17,24,39,0.12)" }}>
              <p className="text-sm font-semibold text-ink mb-3">Quick Color Scan</p>
              {paletteSeason ? <p className="text-ink-stone text-sm mb-3">{paletteSeason}</p> : <p className="text-ink-stone text-sm mb-3">No quick scan saved yet.</p>}
              <div className="flex flex-wrap gap-2">
                {paletteItems.slice(0, 8).map((item) => (
                  <span key={item.hex} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ background: item.hex }}>
                    {item.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-6" style={{ background: "rgba(255,247,251,0.85)", border: "1px solid rgba(17,24,39,0.12)" }}>
              <p className="text-sm font-semibold text-ink mb-4">Recent Looks</p>
              {recentSigned.length === 0 ? (
                <p className="text-sm text-ink-stone">No generated looks yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {recentSigned.map((asset) => (
                    <div key={asset.id} className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(17,24,39,0.10)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.imageUrl ?? ""} alt={asset.tool} className="w-full aspect-square object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}