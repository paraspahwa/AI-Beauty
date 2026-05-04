import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
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

const MAX_MESSAGE_CONTENT_CHARS = 2000;
const MAX_MESSAGES_IN_BODY     = 100; // sanity cap on payload size
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Message = { role: "user" | "assistant"; content: string };(report: Partial<CompiledReport>): string {
  const parts: string[] = [];

  // Face shape
  if (report.faceShape) {
    parts.push(`Face shape: ${report.faceShape.shape} (confidence ${Math.round((report.faceShape.confidence ?? 0) * 100)}%)`);
    if (report.faceShape.traits?.length) parts.push(`Face traits: ${report.faceShape.traits.join(", ")}`);
  }

  // Color analysis — full palette, metals, avoid
  if (report.colorAnalysis) {
    const ca = report.colorAnalysis;
    parts.push(`Color season: ${ca.season}, undertone: ${ca.undertone}`);
    if (ca.description) parts.push(`Season description: ${ca.description}`);
    if (ca.palette?.length) {
      parts.push(`Best colors to wear: ${ca.palette.map((c) => `${c.name} (${c.hex})`).join(", ")}`);
    }
    if (ca.avoidColors?.length) {
      parts.push(`Colors to avoid: ${ca.avoidColors.map((c) => c.name).join(", ")}`);
    }
    if (ca.metals?.length) parts.push(`Best metals/jewellery: ${ca.metals.join(", ")}`);
    if (ca.clothingObservation) {
      parts.push(`Clothing observed in photo: ${ca.clothingObservation.color} — ${ca.clothingObservation.effect} on this person`);
    }
  }

  // Skin analysis — type, concerns, zones, routine
  if (report.skinAnalysis) {
    const sa = report.skinAnalysis;
    parts.push(`Skin type: ${sa.type}`);
    if (sa.concerns?.length) parts.push(`Skin concerns: ${sa.concerns.join(", ")}`);
    if (sa.zones?.length) {
      parts.push(`Skin zone observations: ${sa.zones.map((z) => `${z.zone}: ${z.observation}`).join("; ")}`);
    }
    if (sa.routine?.length) {
      parts.push(`Recommended skincare routine: ${sa.routine.map((r) => `${r.step} → ${r.product}`).join("; ")}`);
    }
  }

  // Facial features — eyes, brows, nose, lips, cheeks
  if (report.features) {
    const f = report.features;
    parts.push(
      `Facial features: eyes (${f.eyes.shape}: ${f.eyes.notes}), eyebrows (${f.eyebrows.shape}: ${f.eyebrows.notes}), nose (${f.nose.shape}: ${f.nose.notes}), lips (${f.lips.shape}: ${f.lips.notes}), cheeks (${f.cheeks.shape}: ${f.cheeks.notes})`
    );
  }

  // Glasses — recommended + avoid + colors + fit tips
  if (report.glasses) {
    const g = report.glasses;
    if (g.recommended?.length) {
      parts.push(`Recommended frame styles: ${g.recommended.map((r) => `${r.style} (${r.reason})`).join("; ")}`);
    }
    if (g.avoid?.length) {
      parts.push(`Frame styles to avoid: ${g.avoid.map((a) => a.style).join(", ")}`);
    }
    if (g.colors?.length) {
      parts.push(`Best frame colors: ${g.colors.map((c) => c.name).join(", ")}`);
    }
    if (g.fitTips?.length) parts.push(`Frame fit tips: ${g.fitTips.join("; ")}`);
  }

  // Hairstyle — flattering, avoid, colors, styling tips
  if (report.hairstyle) {
    const h = report.hairstyle;
    if (h.styles?.length) {
      parts.push(`Recommended hairstyles: ${h.styles.map((s) => `${s.name}: ${s.description}`).join("; ")}`);
    }
    if (h.lengths?.length) {
      parts.push(`Recommended hair lengths: ${h.lengths.map((l) => l.name).join(", ")}`);
    }
    if (h.colors?.length) {
      parts.push(`Flattering hair colors: ${h.colors.map((c) => `${c.name} (${c.description})`).join("; ")}`);
    }
    if (h.avoid?.length) parts.push(`Hairstyles to avoid: ${h.avoid.join(", ")}`);
    if (h.stylingTips?.length) parts.push(`Styling tips: ${h.stylingTips.join("; ")}`);
    if (h.hairType) parts.push(`Hair type: ${h.hairType}`);
  }

  if (report.summary) parts.push(`Overall summary: ${report.summary}`);

  return parts.length > 0
    ? `\n\n--- User's Full Style Profile ---\n${parts.join("\n")}\n---`
    : "";
}

/**
 * GET /api/chat?reportId=<uuid>
 * Returns the persisted chat history for a report (oldest first, last 60 messages).
 */
export async function GET(req: NextRequest) {
  try {
    env.assertServer();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reportId = req.nextUrl.searchParams.get("reportId");
    if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    if (!UUID_RE.test(reportId)) return NextResponse.json({ error: "Invalid reportId" }, { status: 400 });

    // Verify ownership
    const { data: report } = await supabase
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const { data: rows } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })
      .limit(60);

    const messages: Message[] = (rows ?? []).map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[GET /api/chat]", err);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

/**
 * POST /api/chat
 * Body: { reportId: string; messages: { role: "user"|"assistant"; content: string }[] }
 * Returns: { reply: string }
 *
 * Sends the last N messages (capped for cost) to gpt-4o-mini with the
 * full report context injected into the system prompt, then persists
 * the latest user message + assistant reply to chat_messages.
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
    if (!UUID_RE.test(reportId)) {
      return NextResponse.json({ error: "Invalid reportId" }, { status: 400 });
    }
    if (messages.length > MAX_MESSAGES_IN_BODY) {
      return NextResponse.json({ error: "Too many messages in payload" }, { status: 400 });
    }
    // Validate and truncate individual message content to prevent token abuse
    const sanitizedMessages: Message[] = messages.map((m) => ({
      role: m.role === "user" || m.role === "assistant" ? m.role : "user",
      content: String(m.content ?? "").slice(0, MAX_MESSAGE_CONTENT_CHARS),
    }));

    // Fetch report to inject context — must belong to this user
    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from("reports")
      .select("face_shape, color_analysis, skin_analysis, features, glasses, hairstyle, summary, is_paid")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    const reportContext = row ? buildReportContext(row as Partial<CompiledReport>) : "";
    const systemContent = SYSTEM_PROMPT + reportContext;

    // Cap history at last 12 messages to control token cost
    const history = sanitizedMessages.slice(-12).map((m) => ({
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

    // Persist the latest user turn + assistant reply (fire-and-forget, don't block response)
    const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1];
    if (lastUserMsg?.role === "user") {
      void Promise.resolve(
        admin.from("chat_messages").insert([
          { report_id: reportId, user_id: user.id, role: "user",      content: lastUserMsg.content },
          { report_id: reportId, user_id: user.id, role: "assistant",  content: reply },
        ])
      ).catch((e: unknown) => {
        console.warn("[chat] failed to persist messages:", (e as Error).message);
      });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return NextResponse.json({ error: "Chat unavailable right now" }, { status: 500 });
  }
}
