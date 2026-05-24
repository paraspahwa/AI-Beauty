import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_LIMIT = 100;

/**
 * GET /api/studio/vault?limit=50&offset=0&filter=all|canvas|report
 * 
 * List user's generated assets across all contexts (canvas + reports).
 * 
 * Response:
 * {
 *   "assets": [
 *     {
 *       "id": "uuid",
 *       "sourceType": "canvas" | "report",
 *       "sourceId": "uuid",
 *       "tool": "makeup" | "hair" | "clothing",
 *       "hdUrl": "signed-url",
 *       "lowResUrl": "signed-url",
 *       "createdAt": "ISO date",
 *       "savedByUser": boolean
 *     }
 *   ],
 *   "total": number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rawLimit = Number(searchParams.get("limit") ?? "50");
    const rawOffset = Number(searchParams.get("offset") ?? "0");
    const rawFilter = searchParams.get("filter") ?? "all";

    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(rawLimit))) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
    const filter = rawFilter === "canvas" || rawFilter === "report" ? rawFilter : "all";

    // Build query
    let query = supabase
      .from("generated_assets")
      .select(
        "id, studio_canvas_id, report_id, tool, variant, result_image_path, created_at, meta",
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filter
    if (filter === "canvas") {
      query = query.not("studio_canvas_id", "is", null);
    } else if (filter === "report") {
      query = query.not("report_id", "is", null);
    }

    const { data: assets, count, error } = await query;

    if (error) {
      console.error("[studio/vault] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch vault" },
        { status: 500 }
      );
    }

    // Sign URLs for each asset
    const admin = createSupabaseAdminClient();
    const signedAssets = await Promise.all(
      (assets ?? []).map(async (asset) => {
        const { data: signed } = await admin.storage
          .from(env.supabase.bucket)
          .createSignedUrl(asset.result_image_path, 60 * 60 * 24); // 24h

        return {
          id: asset.id,
          sourceType: asset.studio_canvas_id ? "canvas" : "report",
          sourceId: asset.studio_canvas_id ?? asset.report_id,
          tool: asset.tool,
            variant: asset.variant ?? null,
          hdUrl: signed?.signedUrl ?? "",
          lowResUrl: signed?.signedUrl ?? "", // Same for now; can be different path
          createdAt: asset.created_at,
          savedByUser: asset.meta?.saved ?? false,
        };
      })
    );

    return NextResponse.json({
      assets: signedAssets,
      total: count ?? 0,
      limit,
      offset,
    });

  } catch (err) {
    console.error("[studio/vault] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
