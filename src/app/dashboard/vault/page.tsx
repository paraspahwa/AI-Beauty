import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Clock3, Wand2 } from "lucide-react";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

type VaultRow = {
  id: string;
  report_id: string;
  result_image_path: string;
  tool: "virtual_tryon" | "makeup" | "hair";
  variant: string | null;
  created_at: string;
};

function toolLabel(tool: VaultRow["tool"]): string {
  if (tool === "virtual_tryon") return "Virtual Try-On";
  if (tool === "makeup") return "Makeup";
  return "Hair";
}

export default async function VaultPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/dashboard/vault");

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("generated_assets")
    .select("id, report_id, result_image_path, tool, variant, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(240);

  const rows = (data ?? []) as VaultRow[];

  const items = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(row.result_image_path, 60 * 30);
      return {
        ...row,
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  return (
    <main className="container max-w-6xl py-12 min-h-screen">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-medium mb-2" style={{ color: "#111827" }}>Dashboard</p>
          <h1 className="font-sans text-3xl text-ink">My Image Vault</h1>
          <p className="text-sm text-ink-stone mt-1">All generated images with date and time.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(17,24,39,0.14)", color: "#7C5A3A" }}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl p-12 text-center" style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.92), rgba(251,231,242,0.78))", border: "1px dashed rgba(17,24,39,0.20)" }}>
          <Wand2 className="h-10 w-10 mx-auto mb-3" style={{ color: "#C8A96E" }} />
          <p className="text-ink">No generated images yet.</p>
          <p className="text-ink-stone text-sm mt-1">Create looks from any report to build your vault.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(17,24,39,0.14)", boxShadow: "0 8px 26px rgba(0,0,0,0.18)" }}
            >
              <Link href={`/report/${item.report_id}?tab=studio&sourceAssetId=${item.id}`} className="block">
                <div className="relative aspect-[3/4]">
                  {item.signedUrl ? (
                    <Image src={item.signedUrl} alt="Vault image" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="h-full w-full" style={{ background: "rgba(0,0,0,0.04)" }} />
                  )}
                </div>
              </Link>
              <div className="px-3 py-2.5">
                <p className="text-xs font-semibold" style={{ color: "#111827" }}>{toolLabel(item.tool)}</p>
                <p className="text-[11px] text-ink-stone truncate">{item.variant ?? "Generated look"}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px]" style={{ color: "#9C7D5B" }}>
                  <Clock3 className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
