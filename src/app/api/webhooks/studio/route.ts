import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
const MAX_WEBHOOK_BYTES = 64 * 1024;

function safeSecretMatch(provided: string, configured: string): boolean {
  const providedBuf = Buffer.from(provided, "utf8");
  const configuredBuf = Buffer.from(configured, "utf8");
  const maxLen = Math.max(providedBuf.length, configuredBuf.length);
  const aBuf = Buffer.concat([providedBuf, Buffer.alloc(maxLen - providedBuf.length)]);
  const bBuf = Buffer.concat([configuredBuf, Buffer.alloc(maxLen - configuredBuf.length)]);
  const lengthMatch = providedBuf.length === configuredBuf.length;
  return timingSafeEqual(aBuf, bBuf) && lengthMatch;
}

export async function POST(req: NextRequest) {
  const configuredSecret = env.internal.secret;
  const providedSecret = req.headers.get("x-internal-secret") ?? "";
  if (!configuredSecret || configuredSecret.length < 16) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (!safeSecretMatch(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const raw = await req.text();
  if (raw.length > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body:
    | { eventId?: string; eventType?: string; payload?: Record<string, unknown> }
    | null = null;
  try {
    body = JSON.parse(raw) as { eventId?: string; eventType?: string; payload?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!body?.eventId || !body?.eventType) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (body.eventId.length > 128 || body.eventType.length > 64) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!/^[\w.:/-]+$/.test(body.eventId) || !/^[\w.:/-]+$/.test(body.eventType)) {
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