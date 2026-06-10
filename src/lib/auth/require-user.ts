import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getRequestUser } from "@/lib/auth/request-user";

/** Returns user or a 401 NextResponse — use in API route handlers. */
export async function requireUser(
  req: NextRequest,
): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getRequestUser(req);
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}
