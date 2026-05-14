---
description: "Use when writing or editing AI prompts in src/prompts/index.ts. Enforces JSON-only output instructions, correct model tier selection, canary variant registration, and Zod contract alignment for the Renovaara pipeline."
applyTo: "src/prompts/**"
---

# AI Prompt Conventions — Renovaara

All prompts in this file feed the 8-stage beauty analysis pipeline. Every change must follow these rules.

## 1. JSON-only output — mandatory on every prompt

Every prompt **must** instruct the model to return strict JSON with no markdown:

```
Return JSON (strict, no markdown):
{ ... }
```

The `SYSTEM_BASE` constant already contains `"Always respond with strict JSON. No prose, no markdown, no code fences."` — your prompt must not contradict this.

Never ask the model to:
- Wrap output in a code fence (` ```json `)
- Add explanations or prose before/after the JSON
- Use any format other than a plain JSON object

## 2. Model tier selection

| Use | Tier | Env var |
|-----|------|---------|
| Vision calls (image required) | `env.openai.visionModel` | default: `gpt-4o` |
| Text/JSON-only calls | `env.openai.miniModel` | default: `gpt-4o-mini` |

**Do not hardcode model strings.** Always reference `env.openai.visionModel` or `env.openai.miniModel` in `pipeline.ts`. Do not change these to `gpt-5` or any model not in this list — the pipeline output shapes are calibrated for gpt-4o / gpt-4o-mini.

## 3. Canary variant registration

**Every new prompt must have a canary variant entry in `src/lib/ai/canary.ts`.** This is how the eval pipeline and A/B system track which prompt was used.

Rules:
- Add a new `StageKey` union member for each new stage
- The first variant is always `<stage>_v1` with `weight: 1`
- Disabled variants keep `weight: 0` — do not delete them (used for log correlation)
- For dynamic prompts (builder functions), use the sentinel pattern:
  ```typescript
  prompt: "__<stage>_dynamic__"
  ```
  and handle the sentinel in `pipeline.ts`

## 4. Zod contract alignment

Every prompt's JSON schema must have a matching Zod schema in `src/lib/ai/contracts.ts`. When you change a prompt's output shape:
1. Update the Zod schema in `contracts.ts`
2. Update the TypeScript interface in `src/types/report.ts`
3. Update the normalization function's default/fallback values

The normalization function must **never throw** — use `safeParse()` and return safe defaults on failure.

## 5. Confidence fields

If the prompt asks the model to rate its confidence:
- Use `number` in the range `0..1`
- Instruct: `"use values below 0.65 when uncertain"`
- The pipeline uses `blendConfidence()` in `lib/ai/confidence.ts` to merge GPT confidence with Rekognition confidence — do not change this formula

## 6. Injecting server-side evidence

When hard pixel data is available (e.g. extracted clothing colors, Rekognition attributes), inject it as a clearly labeled block at a fixed position in the prompt:

```
SERVER-EXTRACTED <DATA TYPE> (hard evidence — treat as ground truth):
  <value>
```

Use builder functions (not string constants) when the prompt needs dynamic injection. See `buildColorAnalysisPrompt(opts?)` and `buildFeaturesPrompt(rekAttrs?)` as reference implementations.

## 7. Persona and tone

The system prompt `SYSTEM_BASE` sets the "Renovaara stylist" persona — do not override or repeat it in stage prompts. Stage prompts should be terse and analytical. Keep them under ~50 lines.

## 8. eval fixtures

After adding or significantly changing a prompt, add or update a golden fixture in `scripts/eval-fixtures/<stage>/`. Run `npm run eval:stage -- <stage> --runs 3` to verify quality before committing. This calls real OpenAI — do not run in CI without `OPENAI_API_KEY`.
