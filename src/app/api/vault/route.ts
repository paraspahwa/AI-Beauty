import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { compileVaultForUser } from "@/lib/vault/compile-vault";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/vault
 * Returns all uploads and analysis assets the user can access (signed URLs).
 */
export async function GET(req: NextRequest) {
  try {
    env.assertServer();
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const vault = await compileVaultForUser(admin, user.id, user.email);

    return NextResponse.json(vault, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    console.error("[GET /api/vault]", err);
    return NextResponse.json({ error: "Failed to load vault" }, { status: 500 });
  }
}
