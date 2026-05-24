/**
 * GET /api/subscriptions/status
 *
 * Returns the authenticated user's current Studio entitlement status,
 * independent of report existence.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudioEntitlement } from "@/lib/entitlement";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entitlement = await getStudioEntitlement(user.id);
  return NextResponse.json(entitlement);
}