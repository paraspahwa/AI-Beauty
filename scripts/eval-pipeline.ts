#!/usr/bin/env tsx
/**
 * scripts/eval-pipeline.ts
 *
 * Prompt / model canary evaluation harness.
 *
 * Usage:
 *   npx tsx scripts/eval-pipeline.ts [--stage face_shape] [--runs 5]
 *
 * What it does:
 *  1. Loads golden fixture JSON from scripts/eval-fixtures/
 *  2. For each active canary variant in a stage, calls the OpenAI API with the
 *     same fixture image (base64) and records:
 *       - Whether the output passes the Zod contract schema
 *       - Whether key semantic fields match the golden label
 *       - Prompt-token / completion-token counts (cost proxy)
 *       - Latency per call
 *  3. Aggregates across `--runs` independent calls per variant and prints a
 *     Markdown-style report to stdout.
 *
 * Environment variables required (same as the app):
 *   OPENAI_API_KEY
 *   (AWS keys not required — Rekognition is mocked for eval)
 *
 * Fixtures:
 *   scripts/eval-fixtures/<stage>/<id>.json
 *   Each fixture:
 *   {
 *     "imageBase64": "...",         // base64 JPEG, keep small (<100 KB after compress)
 *     "goldenLabel": { ... }        // expected top-level field values to check
 *   }
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// ── Minimal schemas for scoring (mirrors contracts.ts) ───────────────────────

const FaceShapeSchema = z.object({
  shape: z.string(),
  traits: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
});

const ColorAnalysisSchema = z.object({
  season: z.string(),
  undertone: z.enum(["Warm", "Cool", "Neutral"]),
  palette: z.array(z.object({ name: z.string(), hex: z.string() })).min(1),
  metals: z.array(z.string()).min(1),
  avoidColors: z.array(z.object({ name: z.string(), hex: z.string() })).min(1),
});

const SkinAnalysisSchema = z.object({
  type: z.string(),
  concerns: z.array(z.string()).min(0),
  zones: z.array(z.object({ zone: z.string(), observation: z.string() })).min(1),
  routine: z.array(z.object({ step: z.string(), product: z.string() })).min(1),
});

const FeaturesSchema = z.object({
  eyes: z.object({ shape: z.string(), notes: z.string() }),
  nose: z.object({ shape: z.string(), notes: z.string() }),
  lips: z.object({ shape: z.string(), notes: z.string() }),
  cheeks: z.object({ shape: z.string(), notes: z.string() }),
});

const GlassesSchema = z.object({
  goals: z.array(z.string()).min(1),
  recommended: z.array(z.object({ style: z.string(), reason: z.string() })).min(1),
  avoid: z.array(z.object({ style: z.string(), reason: z.string() })).min(1),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })).min(1),
  fitTips: z.array(z.string()).min(1),
});

const HairstyleSchema = z.object({
  styles: z.array(z.object({ name: z.string(), description: z.string() })).min(1),
  lengths: z.array(z.object({ name: z.string(), description: z.string() })).min(1),
  colors: z.array(z.object({ name: z.string(), hex: z.string(), description: z.string() })).min(1),
  avoid: z.array(z.string()).min(1),
});

const SummarySchema = z.object({ summary: z.string().min(50) });

type StageKey = "face_shape" | "color_analysis" | "skin_analysis" | "features" | "glasses" | "hairstyle" | "summary";

const STAGE_SCHEMAS: Record<StageKey, z.ZodTypeAny> = {
  face_shape: FaceShapeSchema,
  color_analysis: ColorAnalysisSchema,
  skin_analysis: SkinAnalysisSchema,
  features: FeaturesSchema,
  glasses: GlassesSchema,
  hairstyle: HairstyleSchema,
  summary: SummarySchema,
};

// ── OpenAI client ─────────────────────────────────────────────────────────────

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Variant definitions (duplicated here so the script runs standalone) ───────

interface EvalVariant {
  id: string;
  model: string;
  prompt: string | ((arg: string) => string);
  needsImage: boolean;
}

const EVAL_VARIANTS: Record<StageKey, EvalVariant[]> = {
  face_shape: [
    {
      id: "face_shape_v1",
      model: "gpt-4o-mini",
      needsImage: true,
      prompt: `Classify the face shape from the photo.
Return JSON: { "shape": "Oval"|"Soft Oval"|"Round"|"Square"|"Heart"|"Diamond"|"Oblong"|"Triangle", "traits": string[3..5], "confidence": number }`,
    },
  ],
  color_analysis: [
    {
      id: "color_v1",
      model: "gpt-4o",
      needsImage: true,
      prompt: `Perform a 12-season color analysis from the photo. Consider skin undertone, hair, and eye color. Ignore background.
Return JSON: { "season": string, "undertone": "Warm"|"Cool"|"Neutral", "description": string, "palette": [{ "name": string, "hex": "#RRGGBB" }], "metals": string[], "avoidColors": [{ "name": string, "hex": "#RRGGBB" }] }`,
    },
    {
      id: "color_v2_dominant",
      model: "gpt-4o",
      needsImage: true,
      prompt: `Perform a 12-season color analysis. Dominant clothing: warm caramel (#C8854A, 42% coverage).
Use clothing as a secondary signal. Return JSON: { "season": string, "undertone": "Warm"|"Cool"|"Neutral", "description": string, "palette": [{ "name": string, "hex": "#RRGGBB" }], "metals": string[], "avoidColors": [{ "name": string, "hex": "#RRGGBB" }], "clothingObservation": { "color": string, "hex": "#RRGGBB", "effect": "flattering"|"clashing"|"neutral" } }`,
    },
  ],
  skin_analysis: [
    {
      id: "skin_v1",
      model: "gpt-4o",
      needsImage: true,
      prompt: `Analyze skin from the photo. Return JSON: { "type": "Oily"|"Dry"|"Combination"|"Normal"|"Sensitive", "concerns": string[], "zones": [{ "zone": string, "observation": string }], "routine": [{ "step": string, "product": string }] }`,
    },
  ],
  features: [
    {
      id: "features_v1",
      model: "gpt-4o-mini",
      needsImage: true,
      prompt: `Describe facial features: eyes, nose, lips, cheeks. Note shape and one styling-relevant detail.
Return JSON: { "eyes": { "shape": string, "notes": string }, "nose": ..., "lips": ..., "cheeks": ... }`,
    },
  ],
  glasses: [
    {
      id: "glasses_v1",
      model: "gpt-4o-mini",
      needsImage: false,
      prompt: (faceShape: string) =>
        `Recommend spectacle frames for a ${faceShape} face.
Return JSON: { "goals": string[3], "recommended": [{ "style": string, "reason": string }], "avoid": [...], "colors": [{ "name": string, "hex": "#RRGGBB" }], "fitTips": string[] }`,
    },
  ],
  hairstyle: [
    {
      id: "hairstyle_v1",
      model: "gpt-4o-mini",
      needsImage: false,
      prompt: (faceShape: string) =>
        `Recommend hairstyles for a ${faceShape} face.
Return JSON: { "styles": [{ "name": string, "description": string }], "lengths": [...], "colors": [{ "name": string, "hex": "#RRGGBB", "description": string }], "avoid": string[] }`,
    },
  ],
  summary: [
    {
      id: "summary_v1",
      model: "gpt-4o-mini",
      needsImage: false,
      prompt: `Write a 120-180 word personalized beauty report intro. Warm, second-person.
Return JSON: { "summary": string }`,
    },
  ],
};

// ── Fixture loader ────────────────────────────────────────────────────────────

interface EvalFixture {
  imageBase64?: string;
  goldenLabel?: Record<string, unknown>;
  /** For non-image stages: the faceShape arg to pass to prompt factories */
  faceShape?: string;
}

function loadFixtures(stage: StageKey): { id: string; fixture: EvalFixture }[] {
  const dir = path.join(__dirname, "eval-fixtures", stage);
  if (!fs.existsSync(dir)) {
    console.warn(`  [eval] No fixture directory for stage "${stage}" at ${dir}`);
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      id: f.replace(".json", ""),
      fixture: JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as EvalFixture,
    }));
}

// ── Single call ───────────────────────────────────────────────────────────────

interface CallResult {
  parsed: unknown;
  valid: boolean;
  schemaErrors: string[];
  goldenMatch: boolean | null;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

async function runSingleCall(
  variant: EvalVariant,
  fixture: EvalFixture,
  schema: z.ZodTypeAny,
): Promise<CallResult> {
  const t0 = Date.now();

  const promptText =
    typeof variant.prompt === "function"
      ? variant.prompt(fixture.faceShape ?? "Oval")
      : variant.prompt;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: "user",
      content: variant.needsImage && fixture.imageBase64
        ? [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${fixture.imageBase64}`, detail: "low" },
            },
          ]
        : promptText,
    },
  ];

  const systemBase =
    "You are an expert beauty and style analyst. Always respond with valid JSON only — no markdown, no explanation.";

  let rawText = "";
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const res = await client.chat.completions.create({
      model: variant.model,
      messages: [{ role: "system", content: systemBase }, ...messages],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    rawText = res.choices[0]?.message?.content ?? "{}";
    promptTokens = res.usage?.prompt_tokens ?? 0;
    completionTokens = res.usage?.completion_tokens ?? 0;
  } catch (err) {
    const latencyMs = Date.now() - t0;
    return {
      parsed: null,
      valid: false,
      schemaErrors: [(err as Error).message],
      goldenMatch: null,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs,
    };
  }

  const latencyMs = Date.now() - t0;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      parsed: rawText,
      valid: false,
      schemaErrors: ["JSON parse failed"],
      goldenMatch: null,
      promptTokens,
      completionTokens,
      latencyMs,
    };
  }

  const result = schema.safeParse(parsed);
  const schemaErrors = result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  // Golden match: check each key in goldenLabel against the parsed output
  let goldenMatch: boolean | null = null;
  if (fixture.goldenLabel && result.success) {
    const p = parsed as Record<string, unknown>;
    goldenMatch = Object.entries(fixture.goldenLabel).every(([k, v]) => {
      const actual = p[k];
      return JSON.stringify(actual).toLowerCase().includes(String(v).toLowerCase());
    });
  }

  return { parsed, valid: result.success, schemaErrors, goldenMatch, promptTokens, completionTokens, latencyMs };
}

// ── Stage evaluation ──────────────────────────────────────────────────────────

interface VariantStats {
  variantId: string;
  runs: number;
  schemaPassRate: number;
  goldenMatchRate: number | null;
  avgLatencyMs: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  estimatedCostUsd: number;
  sampleErrors: string[];
}

/** Very rough cost estimate (2025 pricing) */
function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 0.000005, output: 0.000015 },
    "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
  };
  const p = pricing[model] ?? pricing["gpt-4o-mini"];
  return promptTokens * p.input + completionTokens * p.output;
}

async function evaluateStage(
  stage: StageKey,
  runsPerVariant: number,
  singleFixture?: EvalFixture,
): Promise<VariantStats[]> {
  const variants = EVAL_VARIANTS[stage];
  const schema = STAGE_SCHEMAS[stage];
  const fixtures = singleFixture ? [{ id: "inline", fixture: singleFixture }] : loadFixtures(stage);

  if (fixtures.length === 0) {
    // Use a minimal stub fixture when no fixtures exist
    fixtures.push({
      id: "stub",
      fixture: {
        faceShape: "Oval",
        goldenLabel: undefined,
      },
    });
  }

  const stats: VariantStats[] = [];

  for (const variant of variants) {
    console.log(`\n  Variant: ${variant.id} (${variant.model})`);
    const results: CallResult[] = [];

    for (let run = 0; run < runsPerVariant; run++) {
      const { fixture } = fixtures[run % fixtures.length];
      process.stdout.write(`    run ${run + 1}/${runsPerVariant}... `);
      const r = await runSingleCall(variant, fixture, schema);
      results.push(r);
      process.stdout.write(r.valid ? "✓\n" : `✗ (${r.schemaErrors[0] ?? "?"})\n`);
    }

    const schemaPassRate = results.filter((r) => r.valid).length / results.length;
    const goldenResults = results.filter((r) => r.goldenMatch !== null);
    const goldenMatchRate =
      goldenResults.length > 0
        ? goldenResults.filter((r) => r.goldenMatch).length / goldenResults.length
        : null;
    const avgLatencyMs = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;
    const avgPromptTokens = results.reduce((s, r) => s + r.promptTokens, 0) / results.length;
    const avgCompletionTokens = results.reduce((s, r) => s + r.completionTokens, 0) / results.length;
    const estimatedCostUsd = estimateCost(
      variant.model,
      avgPromptTokens * results.length,
      avgCompletionTokens * results.length,
    );
    const sampleErrors = [
      ...new Set(results.flatMap((r) => r.schemaErrors).slice(0, 3)),
    ];

    stats.push({
      variantId: variant.id,
      runs: results.length,
      schemaPassRate,
      goldenMatchRate,
      avgLatencyMs,
      avgPromptTokens,
      avgCompletionTokens,
      estimatedCostUsd,
      sampleErrors,
    });
  }

  return stats;
}

// ── Report printer ────────────────────────────────────────────────────────────

function printReport(allStats: Record<StageKey, VariantStats[]>) {
  console.log("\n\n=== EVAL REPORT ===\n");

  for (const [stage, variantStats] of Object.entries(allStats) as [StageKey, VariantStats[]][]) {
    console.log(`## Stage: ${stage}`);
    console.log(
      "| Variant | Schema% | Golden% | Avg ms | PromptTok | CompTok | Est cost |",
    );
    console.log("|---------|---------|---------|--------|-----------|---------|----------|");

    for (const s of variantStats) {
      const goldenStr = s.goldenMatchRate !== null ? `${(s.goldenMatchRate * 100).toFixed(0)}%` : "n/a";
      const row = [
        s.variantId,
        `${(s.schemaPassRate * 100).toFixed(0)}%`,
        goldenStr,
        `${Math.round(s.avgLatencyMs)}`,
        `${Math.round(s.avgPromptTokens)}`,
        `${Math.round(s.avgCompletionTokens)}`,
        `$${s.estimatedCostUsd.toFixed(4)}`,
      ];
      console.log(`| ${row.join(" | ")} |`);

      if (s.sampleErrors.length > 0) {
        console.log(`  ⚠  Errors: ${s.sampleErrors.join("; ")}`);
      }
    }
    console.log();
  }

  // Winner summary
  console.log("## Recommendations\n");
  for (const [stage, variantStats] of Object.entries(allStats) as [StageKey, VariantStats[]][]) {
    if (variantStats.length < 2) continue;
    const best = variantStats.reduce((a, b) => (a.schemaPassRate >= b.schemaPassRate ? a : b));
    console.log(`- **${stage}**: prefer \`${best.variantId}\` (${(best.schemaPassRate * 100).toFixed(0)}% schema pass)`);
  }
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const stageArg = args.find((_, i) => args[i - 1] === "--stage") as StageKey | undefined;
  const runsArg = args.find((_, i) => args[i - 1] === "--runs");
  const runsPerVariant = runsArg ? parseInt(runsArg, 10) : 3;

  const stages: StageKey[] = stageArg
    ? [stageArg]
    : ["face_shape", "color_analysis", "skin_analysis", "features", "glasses", "hairstyle", "summary"];

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  console.log(`AI-Beauty prompt eval harness`);
  console.log(`Stages: ${stages.join(", ")}`);
  console.log(`Runs per variant: ${runsPerVariant}`);
  console.log("─".repeat(60));

  const allStats: Partial<Record<StageKey, VariantStats[]>> = {};

  for (const stage of stages) {
    console.log(`\n▶ Evaluating stage: ${stage}`);
    allStats[stage] = await evaluateStage(stage, runsPerVariant);
  }

  printReport(allStats as Record<StageKey, VariantStats[]>);

  // Exit non-zero if any stage has schema pass rate < 80%
  const failures = Object.entries(allStats).filter(([, vs]) =>
    (vs as VariantStats[]).some((s) => s.schemaPassRate < 0.8),
  );
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} stage(s) below 80% schema pass rate.`);
    process.exit(1);
  }
  console.log("\n✅ All stages passed the 80% schema threshold.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
