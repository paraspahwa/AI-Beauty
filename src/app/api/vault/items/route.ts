import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { deleteVaultItem } from "@/lib/vault/delete-vault-item";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * DELETE /api/vault/items
 * Body: { itemId: string } — composite id from vault listing (e.g. uuid:upload:selfie)
 */
export async function DELETE(req: NextRequest) {
  try {
    env.assertServer();
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let itemId: string | undefined;
    try {
      const body = (await req.json()) as { itemId?: string };
      itemId = body.itemId;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    await deleteVaultItem(admin, user.id, itemId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    const status =
      message === "Report not found" || message === "Analysis asset not found" || message === "Invalid vault item"
        ? 404
        : message.includes("already removed")
          ? 409
          : 500;

    if (status === 500) {
      console.error("[DELETE /api/vault/items]", err);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
