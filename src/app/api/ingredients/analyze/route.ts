import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/ai/openai";
import { env } from "@/lib/env";
import { consumeIdentityWindow } from "@/lib/rate-limit";
import { buildIngredientAnalysisPrompt, SYSTEM_BASE } from "@/prompts/index";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_INGREDIENT_CHARS = 4000; // ~1 full ingredient list, prevents token abuse
const INGREDIENT_ANALYZE_POLICY = {
  action: "ingredients_analyze_60s",
  windowSeconds: 60,
  caps: {
    free: 12,
    report: 24,
    studio_pro: 60,
  },
} as const;

export interface IngredientFlag {
  name: string;
  verdict: "beneficial" | "neutral" | "caution" | "avoid";
  reason: string;
}

export interface IngredientAnalysisResult {
  overallScore: number;
  summary: string;
  highlights: string[];
  concerns: string[];
  flags: IngredientFlag[];
}

type RequestBody = {
  ingredients: string;
  skinContext?: {
    type: string;
    concerns: string[];
  };
};

export async function POST(req: NextRequest) {
  // Auth check — require a valid session
  env.assertServer();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const isAdmin = env.auth.adminEmailAllowlist.includes((user.email ?? "").toLowerCase());
  if (!isAdmin) {
    const admin = createSupabaseAdminClient();
    const decision = await consumeIdentityWindow(admin, user.id, INGREDIENT_ANALYZE_POLICY);
    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Ingredient analysis rate limit reached. Please try again shortly.",
          code: "RATE_LIMITED",
          action: decision.action,
          tier: decision.tier,
          limit: decision.cap,
          windowSeconds: decision.windowSeconds,
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(decision.retryAfterSeconds),
            "X-RateLimit-Limit": String(decision.cap),
            "X-RateLimit-Window": `${decision.windowSeconds}s`,
          },
        },
      );
    }
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ingredients =
    typeof body.ingredients === "string" ? body.ingredients.trim() : "";

  if (!ingredients || ingredients.length < 10) {
    return NextResponse.json(
      { error: "Please provide an ingredient list." },
      { status: 422 }
    );
  }

  if (ingredients.length > MAX_INGREDIENT_CHARS) {
    return NextResponse.json(
      { error: `Ingredient list too long (max ${MAX_INGREDIENT_CHARS} characters).` },
      { status: 422 }
    );
  }

  // Validate and normalise skinContext (optional, user-supplied — sanitise fields)
  const rawCtx = body.skinContext;
  const skinContext =
    rawCtx &&
    typeof rawCtx.type === "string" &&
    Array.isArray(rawCtx.concerns)
      ? {
          type: rawCtx.type.slice(0, 50),
          concerns: rawCtx.concerns
            .filter((c): c is string => typeof c === "string")
            .slice(0, 10)
            .map((c) => c.slice(0, 80)),
        }
      : undefined;

  const systemPrompt = SYSTEM_BASE;
  const userPrompt =
    buildIngredientAnalysisPrompt(skinContext) +
    `\n\nINGREDIENT LIST:\n${ingredients}`;

  type RawResult = IngredientAnalysisResult & { error?: string };

  let result: RawResult;
  try {
    result = await chatJSON<RawResult>({
      model: env.openai.miniModel, // gpt-4o-mini — no vision needed, cost-efficient
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.2, // low temp for consistent scientific analysis
    });
  } catch (err) {
    console.error("[ingredients/analyze] OpenAI error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 502 }
    );
  }

  // If the AI flagged a bad input
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Basic schema guard — reject malformed AI output
  if (
    typeof result.overallScore !== "number" ||
    typeof result.summary !== "string" ||
    !Array.isArray(result.flags)
  ) {
    console.error("[ingredients/analyze] Unexpected AI response shape:", result);
    return NextResponse.json(
      { error: "Analysis returned an unexpected format. Please try again." },
      { status: 502 }
    );
  }

  // Clamp score to valid range
  result.overallScore = Math.max(1, Math.min(10, Math.round(result.overallScore)));

  return NextResponse.json(result satisfies IngredientAnalysisResult);
}
