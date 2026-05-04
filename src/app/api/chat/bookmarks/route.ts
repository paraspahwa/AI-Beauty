import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * GET /api/chat/bookmarks?reportId=<uuid>
 * Returns all bookmarks for a report, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    env.assertServer();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reportId = req.nextUrl.searchParams.get("reportId");
    if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

    // Verify ownership
    const { data: report } = await supabase
      .from("reports").select("id").eq("id", reportId).eq("user_id", user.id).single();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const { data } = await supabase
      .from("chat_bookmarks")
      .select("id, content, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ bookmarks: data ?? [] });
  } catch (err) {
    console.error("[GET /api/chat/bookmarks]", err);
    return NextResponse.json({ error: "Failed to load bookmarks" }, { status: 500 });
  }
}

/**
 * POST /api/chat/bookmarks
 * Body: { reportId: string; content: string }
 * Saves an assistant message as a bookmark.
 */
export async function POST(req: NextRequest) {
  try {
    env.assertServer();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { reportId?: string; content?: string };
    if (!body.reportId || !body.content?.trim()) {
      return NextResponse.json({ error: "reportId and content required" }, { status: 400 });
    }

    // Verify ownership
    const { data: report } = await supabase
      .from("reports").select("id").eq("id", body.reportId).eq("user_id", user.id).single();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("chat_bookmarks")
      .insert({ report_id: body.reportId, user_id: user.id, content: body.content.trim() })
      .select("id, content, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ bookmark: data });
  } catch (err) {
    console.error("[POST /api/chat/bookmarks]", err);
    return NextResponse.json({ error: "Failed to save bookmark" }, { status: 500 });
  }
}
