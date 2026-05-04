import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/reports/[id]/share
 * Generate (or return existing) public share token for the authenticated owner.
 * Idempotent: if a token already exists it is returned unchanged.
 * Returns: { shareToken: string, shareUrl: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Fetch the report — must be owned by the user and in "ready" state
  const { data: report, error } = await admin
    .from("reports")
    .select("id, share_token, status, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (report.status !== "ready") {
    return NextResponse.json({ error: "Report is not ready yet" }, { status: 400 });
  }

  // Idempotent: return existing token if present
  if (report.share_token) {
    const origin = new URL(req.url).origin;
    return NextResponse.json({
      shareToken: report.share_token,
      shareUrl: `${origin}/r/${report.share_token}`,
    });
  }

  // Generate new token
  const { data: updated, error: updateErr } = await admin
    .from("reports")
    .update({ share_token: crypto.randomUUID() })
    .eq("id", id)
    .select("share_token")
    .single();

  if (updateErr || !updated?.share_token) {
    console.error("[POST /api/reports/[id]/share]", updateErr);
    return NextResponse.json({ error: "Failed to generate share token" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    shareToken: updated.share_token,
    shareUrl: `${origin}/r/${updated.share_token}`,
  });
}

/**
 * DELETE /api/reports/[id]/share
 * Revoke the public share token — the report becomes private again.
 * Returns: { ok: true }
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
  const { error } = await admin
    .from("reports")
    .update({ share_token: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[DELETE /api/reports/[id]/share]", error);
    return NextResponse.json({ error: "Failed to revoke share token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
