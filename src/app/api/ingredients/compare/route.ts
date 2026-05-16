import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/ai/openai";
import { env } from "@/lib/env";
import { buildProductComparisonPrompt, SYSTEM_BASE } from "@/prompts/index";
import type { IngredientFlag } from "@/app/api/ingredients/analyze/route";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_INGREDIENT_CHARS = 4000;

export interface ProductComparisonSide {
  score: number;
  highlights: string[];
  concerns: string[];
  flags: IngredientFlag[];
}

export interface ProductComparisonResult {
  winner: "A" | "B" | "tie";
  winnerReason: string;
  recommendation: string;
  productA: ProductComparisonSide;
  productB: ProductComparisonSide;
}

type ProductInput = {
  name?: string;
  ingredients: string;
};

type RequestBody = {
  productA: ProductInput;
  productB: ProductInput;
  skinContext?: {
    type: string;
    concerns: string[];
  };
};

function sanitiseSkinContext(raw: unknown) {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("type" in raw) ||
    typeof (raw as Record<string, unknown>).type !== "string" ||
    !Array.isArray((raw as Record<string, unknown>).concerns)
  ) {
    return undefined;
  }
  const r = raw as { type: string; concerns: unknown[] };
  return {
    type: r.type.slice(0, 50),
    concerns: r.concerns
      .filter((c): c is string => typeof c === "string")
      .slice(0, 10)
      .map((c) => c.slice(0, 80)),
  };
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ingA =
    typeof body.productA?.ingredients === "string"
      ? body.productA.ingredients.trim()
      : "";
  const ingB =
    typeof body.productB?.ingredients === "string"
      ? body.productB.ingredients.trim()
      : "";

  if (ingA.length < 10) {
    return NextResponse.json(
      { error: "Please provide an ingredient list for Product A." },
      { status: 422 }
    );
  }
  if (ingB.length < 10) {
    return NextResponse.json(
      { error: "Please provide an ingredient list for Product B." },
      { status: 422 }
    );
  }
  if (ingA.length > MAX_INGREDIENT_CHARS || ingB.length > MAX_INGREDIENT_CHARS) {
    return NextResponse.json(
      { error: `Each ingredient list must be under ${MAX_INGREDIENT_CHARS} characters.` },
      { status: 422 }
    );
  }

  const skinContext = sanitiseSkinContext(body.skinContext);

  const nameA =
    typeof body.productA?.name === "string"
      ? body.productA.name.slice(0, 100).trim()
      : "Product A";
  const nameB =
    typeof body.productB?.name === "string"
      ? body.productB.name.slice(0, 100).trim()
      : "Product B";

  const userPrompt =
    buildProductComparisonPrompt(skinContext) +
    `\n\nPRODUCT A — ${nameA}:\n${ingA}` +
    `\n\nPRODUCT B — ${nameB}:\n${ingB}`;

  type RawResult = ProductComparisonResult & { error?: string };

  let result: RawResult;
  try {
    result = await chatJSON<RawResult>({
      model: env.openai.miniModel,
      system: SYSTEM_BASE,
      user: userPrompt,
      temperature: 0.2,
    });
  } catch (err) {
    console.error("[ingredients/compare] OpenAI error:", err);
    return NextResponse.json(
      { error: "Comparison failed. Please try again." },
      { status: 502 }
    );
  }

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Basic schema guard
  if (
    !result.productA ||
    !result.productB ||
    typeof result.productA.score !== "number" ||
    typeof result.productB.score !== "number" ||
    !["A", "B", "tie"].includes(result.winner)
  ) {
    console.error("[ingredients/compare] Unexpected shape:", result);
    return NextResponse.json(
      { error: "Comparison returned an unexpected format. Please try again." },
      { status: 502 }
    );
  }

  // Clamp scores
  result.productA.score = Math.max(1, Math.min(10, Math.round(result.productA.score)));
  result.productB.score = Math.max(1, Math.min(10, Math.round(result.productB.score)));

  return NextResponse.json(result satisfies ProductComparisonResult);
}
