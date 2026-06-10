import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "24");
    const pageRaw = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const reportId = req.nextUrl.searchParams.get("reportId");

    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 24;
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("generated_assets")
      .select("id, report_id, source_asset_id, result_image_path, tool, variant, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (reportId) query = query.eq("report_id", reportId);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: "Failed to load vault" }, { status: 500 });

    const items = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed } = await admin.storage
          .from(env.supabase.bucket)
          .createSignedUrl(row.result_image_path as string, 60 * 30);

        return {
          id: row.id,
          reportId: row.report_id,
          sourceAssetId: row.source_asset_id,
          tool: row.tool,
          variant: row.variant,
          imagePath: row.result_image_path,
          imageUrl: signed?.signedUrl ?? null,
          createdAt: row.created_at,
        };
      }),
    );

    return NextResponse.json({
      items,
      page,
      limit,
      total: count ?? 0,
      hasMore: typeof count === "number" ? page * limit < count : false,
    });
  } catch (err) {
    console.error("[vault/images GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
