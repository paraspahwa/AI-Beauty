import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * GET /api/reports/[id]/pdf
 * Renders an HTML version of the report and returns it.
 * In production this would be piped through a headless browser (e.g. @sparticuz/chromium + puppeteer-core).
 * To keep the scaffold dependency-light we return printable HTML the browser can save as PDF.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!env.flags.pdfEnabled) {
    return NextResponse.json({ error: "PDF disabled" }, { status: 403 });
  }
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!row || !row.is_paid) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  const html = renderHtml(row);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="styleai-report-${row.id}.html"`,
    },
  });
}

function renderHtml(r: Record<string, unknown>): string {
  const safe = JSON.stringify(r, null, 2);
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>StyleAI Report</title>
<style>
  body { font-family: Georgia, serif; background: #FAF7F2; color: #2A1F14; padding: 48px; }
  h1 { font-size: 32px; }
  pre { background: #fff; padding: 16px; border-radius: 12px; white-space: pre-wrap; word-break: break-word; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <h1>✦ StyleAI Personal Beauty Report ✦</h1>
  <p>Use your browser's print dialog to save this report as a PDF.</p>
  <pre>${safe.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>
</body></html>`;
}
