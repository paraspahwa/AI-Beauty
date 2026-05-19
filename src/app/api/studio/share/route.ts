import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as { canvasId?: string }));
  if (typeof body.canvasId !== "string" || !UUID_RE.test(body.canvasId)) {
    return NextResponse.json({ error: "canvasId required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: canvas } = await admin
    .from("studio_canvases")
    .select("id, user_id, share_token")
    .eq("id", body.canvasId)
    .single();
  if (!canvas || canvas.user_id !== user.id) {
    return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
  }

  if (!canvas.share_token) {
    const { data: updated, error } = await admin
      .from("studio_canvases")
      .update({ share_token: crypto.randomUUID() })
      .eq("id", body.canvasId)
      .eq("user_id", user.id)
      .select("share_token")
      .single();
    if (error || !updated?.share_token) {
      return NextResponse.json({ error: "Failed to create share token" }, { status: 500 });
    }
    return NextResponse.json({
      shareToken: updated.share_token,
      shareUrl: `${env.app.url}/c/${updated.share_token}`,
    });
  }

  return NextResponse.json({
    shareToken: canvas.share_token,
    shareUrl: `${env.app.url}/c/${canvas.share_token}`,
  });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({} as { canvasId?: string }));
  if (typeof body.canvasId !== "string" || !UUID_RE.test(body.canvasId)) {
    return NextResponse.json({ error: "canvasId required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("studio_canvases")
    .update({ share_token: null })
    .eq("id", body.canvasId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to revoke share token" }, { status: 500 });
  return NextResponse.json({ ok: true });
}