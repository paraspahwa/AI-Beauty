import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 15;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/reports/[id]/delete
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Confirm ownership before deleting
  const { data: report } = await admin
    .from("reports")
    .select("id, user_id, image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete image from storage (best-effort — don't fail if already gone)
  if (report.image_path && report.image_path !== "pending") {
    await admin.storage.from(env.supabase.bucket).remove([report.image_path]).catch(() => {});
  }

  const { error } = await admin.from("reports").delete().eq("id", id);
  if (error) {
    console.error("[DELETE /api/reports/[id]]", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
