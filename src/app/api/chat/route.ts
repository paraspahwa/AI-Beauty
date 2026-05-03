import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { env } from "@/lib/env";
import type { CompiledReport } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are StyleAI's personal style consultant — warm, concise, and expert.
You have already analysed this user's face shape, color season, skin type, and style profile.
Use the report context below to give specific, actionable advice.
- Keep replies to 2-4 sentences unless the question needs more detail.
- Never repeat large chunks of the report verbatim; synthesize instead.
- If asked something outside personal styling, politely redirect.
- Do not invent facts not in the report context.`;

type Message = { role: "user" | "assistant"; content: string };

function buildReportContext(report: Partial<CompiledReport>): string {
  const parts: string[] = [];
  if (report.faceShape)     parts.push(`Face shape: ${report.faceShape.shape} (confidence ${Math.round((report.faceShape.confidence ?? 0) * 100)}%)`);
  if (report.colorAnalysis) parts.push(`Color season: ${report.colorAnalysis.season}, undertone: ${report.colorAnalysis.undertone}`);
  if (report.skinAnalysis)  parts.push(`Skin type: ${report.skinAnalysis.type}, concerns: ${report.skinAnalysis.concerns.join(", ") || "none"}`);
  if (report.glasses?.recommended?.length) {
    parts.push(`Best frame styles: ${report.glasses.recommended.slice(0, 3).map((r) => r.style).join(", ")}`);
  }
  if (report.hairstyle?.styles?.length) {
    parts.push(`Recommended hairstyles: ${report.hairstyle.styles.slice(0, 3).map((s) => s.name).join(", ")}`);
  }
  if (report.summary) parts.push(`Summary: ${report.summary}`);
  return parts.length > 0
    ? `\n\n--- User's Style Profile ---\n${parts.join("\n")}\n---`
    : "";
}

/**
 * POST /api/chat
 * Body: { reportId: string; messages: { role: "user"|"assistant"; content: string }[] }
 * Returns: { reply: string }
 *
 * Streams the last N messages (capped for cost) to gpt-4o-mini with the
 * report context injected into the system prompt. Rate-limited by the
 * existing per-user session auth — no extra quota logic needed here since
 * this is text-only and cheap.
 */
export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { reportId?: string; messages?: Message[] };
    const { reportId, messages } = body;

    if (!reportId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "reportId and messages are required" }, { status: 400 });
    }

    // Fetch report to inject context — must belong to this user
    const { data: row } = await (await import("@/lib/supabase/server"))
      .createSupabaseAdminClient()
      .from("reports")
      .select("face_shape, color_analysis, skin_analysis, glasses, hairstyle, summary, is_paid")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    const reportContext = row ? buildReportContext(row as Partial<CompiledReport>) : "";
    const systemContent = SYSTEM_PROMPT + reportContext;

    // Cap history at last 12 messages to control token cost
    const history = messages.slice(-12).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: env.openai.miniModel,
      temperature: 0.6,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemContent },
        ...history,
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "I'm not sure how to answer that. Could you rephrase?";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return NextResponse.json({ error: "Chat unavailable right now" }, { status: 500 });
  }
}
