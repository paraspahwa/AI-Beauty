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

  // Remove the original selfie
  if (report.image_path && report.image_path !== "pending") {
    await admin.storage.from(env.supabase.bucket).remove([report.image_path]).catch(() => {});
  }

  // Remove all visual asset files: visuals folder + hair-color try-ons
  // Paths follow: {userId}/{reportId}/visuals/v1/* and users/{userId}/reports/{reportId}/*
  const visualsPrefix = `${user.id}/${id}/visuals/`;
  const hairColorPrefix = `users/${user.id}/reports/${id}/`;
  await Promise.allSettled([
    admin.storage.from(env.supabase.bucket).list(visualsPrefix).then(({ data }) => {
      if (data && data.length > 0) {
        const paths = data.map((f) => `${visualsPrefix}${f.name}`);
        return admin.storage.from(env.supabase.bucket).remove(paths);
      }
    }),
    // Remove nested v1/ subfolder files
    admin.storage.from(env.supabase.bucket).list(`${visualsPrefix}v1/`).then(({ data }) => {
      if (data && data.length > 0) {
        const paths = data.map((f) => `${visualsPrefix}v1/${f.name}`);
        return admin.storage.from(env.supabase.bucket).remove(paths);
      }
    }),
    admin.storage.from(env.supabase.bucket).list(hairColorPrefix).then(({ data }) => {
      if (data && data.length > 0) {
        const paths = data.map((f) => `${hairColorPrefix}${f.name}`);
        return admin.storage.from(env.supabase.bucket).remove(paths);
      }
    }),
  ]);

  const { error } = await admin.from("reports").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[DELETE /api/reports/[id]]", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
