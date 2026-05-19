import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!env.internal.secret || secret !== env.internal.secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as
    | { eventId?: string; eventType?: string; payload?: Record<string, unknown> }
    | null;

  if (!body?.eventId || !body?.eventType) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("record_webhook_event", {
    p_provider: "studio",
    p_provider_event_id: body.eventId,
    p_event_type: body.eventType,
    p_raw: body.payload ?? {},
  });

  if (error) {
    console.error("[webhooks/studio] record_webhook_event failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: data === true }, { status: 202 });
}