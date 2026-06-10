/**
 * GET /api/subscriptions/status
 *
 * Returns the authenticated user's current Studio entitlement status,
 * independent of report existence.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { getStudioEntitlement } from "@/lib/entitlement";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entitlement = await getStudioEntitlement(user.id);
  return NextResponse.json(entitlement);
}