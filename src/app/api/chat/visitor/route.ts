/**
 * POST /api/chat/visitor
 *
 * Unauthenticated pre-sales chat for website visitors.
 * Answers questions about Renovaara and nudges toward conversion.
 * Uses gpt-4o-mini to keep cost low. No user data is stored.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getOpenAI } from "@/lib/ai/openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY       = 8; // pairs kept in context
const VISITOR_CHAT_WINDOW_MS = 60_000;
const VISITOR_CHAT_MAX = 15;
const VISITOR_LIMIT_MAP_MAX = 4096;

const SYSTEM_PROMPT = `You are Aria, Renovaara's friendly pre-sales assistant. Your job is to answer visitor questions about Renovaara and guide them toward getting their free beauty analysis.

ABOUT RENOVAARA:
- Renovaara is an AI-powered beauty and style analysis SaaS.
- Upload ONE selfie → get a full personalized beauty report in under 60 seconds.
- The analysis covers: face shape, color season & undertone, makeup recommendations, hairstyle & color guide, spectacles frame recommendations, AM/PM skin routine, and a Do vs Avoid Style Guide (which silhouettes and necklines suit you most).
- AI Makeup Studio lets you virtually preview lip, eye, blush, and contour looks on your face before buying.
- Virtual clothing try-on for outfits.
- An AI style consultant chat lets you ask follow-up style questions anytime.

PRICING:
- Free Preview: Rs 0 — face shape overview, starter summary, shareable link. No card required.
- Full Report: Rs 299 (one-time) — everything above including AI Makeup Studio, virtual try-on, spectacles guide, hairstyle guide, skin routine, Style Guide, and AI consultant chat.
- Studio Pro: Rs 999/month — higher generation limits, priority processing, continuous style tracking, unlimited chat sessions.

PRIVACY:
- Photos are processed securely and only accessible within the user's own account.
- The selfie bucket is private; no photo is shared publicly.

HOW IT WORKS:
1. Upload a clear, front-facing selfie in natural light.
2. AI analyzes face shape, color season, skin, and style traits in under a minute.
3. Browse the Do vs Avoid Style Guide for instant style wins.
4. Try virtual makeup and clothing. Unlock the full report.

CONVERSION GUIDANCE:
- If a visitor seems interested, encourage them to start the free analysis — no card required.
- The free tier gives a real taste of the product (face shape + style summary).
- Keep answers concise: 2-4 sentences unless a list genuinely helps.
- Never invent features that don't exist.
- If a question is completely off-topic (coding, politics, etc.), politely redirect.
- Do NOT include markdown links or raw URLs — the UI adds CTA buttons separately.`;

type Message = { role: "user" | "assistant"; content: string };

type VisitorWindow = { count: number; resetAt: number };
const visitorWindows = new Map<string, VisitorWindow>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown-ip"
  );
}

function getVisitorIdentityKey(req: NextRequest): string {
  const visitorId = req.cookies.get("rv_visitor_id")?.value
    ?? req.headers.get("x-visitor-id")
    ?? req.headers.get("x-session-id")
    ?? "anon";
  const ua = req.headers.get("user-agent") ?? "unknown-ua";
  return `visitor:${visitorId.slice(0, 128)}:${getClientIp(req)}:${ua.slice(0, 80)}`;
}

function isVisitorRateLimited(req: NextRequest): boolean {
  const now = Date.now();
  const key = getVisitorIdentityKey(req);
  let entry = visitorWindows.get(key);

  if (!entry || now > entry.resetAt) {
    if (!entry && visitorWindows.size >= VISITOR_LIMIT_MAP_MAX) {
      const firstKey = visitorWindows.keys().next().value;
      if (firstKey !== undefined) visitorWindows.delete(firstKey);
    }
    entry = { count: 1, resetAt: now + VISITOR_CHAT_WINDOW_MS };
    visitorWindows.set(key, entry);
    return false;
  }

  entry.count += 1;
  return entry.count > VISITOR_CHAT_MAX;
}

export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    if (isVisitorRateLimited(req)) {
      return NextResponse.json(
        {
          error: "Too many visitor chat requests. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
          limit: VISITOR_CHAT_MAX,
          windowSeconds: 60,
          retryAfterSeconds: 60,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": String(VISITOR_CHAT_MAX),
            "X-RateLimit-Window": "60s",
          },
        },
      );
    }

    let body: { messages?: Message[] };
    try {
      body = (await req.json()) as { messages?: Message[] };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const raw = body.messages;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }
    if (raw.length > MAX_HISTORY * 2 + 4) {
      return NextResponse.json({ error: "Too many messages in payload" }, { status: 400 });
    }

    // Sanitize and cap input
    const messages: Message[] = raw
      .slice(-MAX_HISTORY * 2)
      .map((m) => ({
        role: (m.role === "user" || m.role === "assistant" ? m.role : "user") as "user" | "assistant",
        content: String(m.content ?? "").slice(0, MAX_MESSAGE_CHARS),
      }))
      .filter((m) => m.content.trim().length > 0);

    if (messages.length === 0) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: env.openai.miniModel,
      temperature: 0.6,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ??
      "I'm not sure about that — want to try the free analysis and see for yourself?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[POST /api/chat/visitor]", err);
    return NextResponse.json({ error: "Chat unavailable right now. Please try again shortly." }, { status: 500 });
  }
}
