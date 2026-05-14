---
description: "Scaffold a new AI pipeline stage for the Renovaara beauty analysis pipeline. Generates the Zod contract, prompt constant/builder in src/prompts/index.ts, canary variant registration in src/lib/ai/canary.ts, pipeline wiring in src/lib/ai/pipeline.ts, and the output type in src/types/report.ts."
name: "Add Pipeline Stage"
argument-hint: "Stage name and what it analyses (e.g. 'nail_shape — classify nail shape and recommend nail styles')"
tools: [read, edit, search]
---

Scaffold a new AI analysis pipeline stage for Renovaara. The stage name and purpose are: **{{STAGE_DESCRIPTION}}**

Follow these steps **in order**, reading each relevant file before editing it.

---

## Step 1 — Add the output type to `src/types/report.ts`

Read `src/types/report.ts` first. Then append a new exported interface for this stage's result. Follow the pattern of existing result types (e.g. `FaceShapeResult`, `GlassesResult`). Include:
- All fields the AI will return
- JSDoc comment explaining the type
- Export the type

Also add the field to the `CompiledReport` interface (the root type).

---

## Step 2 — Write the prompt in `src/prompts/index.ts`

Read `src/prompts/index.ts` first. Then add either:
- A **constant** (`export const <STAGE>_PROMPT = \`...\``) if the prompt has no dynamic inputs, **or**
- A **builder function** (`export function build<Stage>Prompt(opts?: {...}): string`) if it needs runtime context injected

Rules for every prompt:
1. Start with the analysis task description
2. Instruct the model: **"Return JSON (strict, no markdown):"** followed by the exact shape
3. Every field in the JSON schema must match the TypeScript interface from Step 1
4. Use `number` (0..1) for any confidence field; instruct the model to use values below 0.65 when uncertain
5. Never ask the model to return prose, explanations, or markdown fences

---

## Step 3 — Register a canary variant in `src/lib/ai/canary.ts`

Read `src/lib/ai/canary.ts` first. Then:
1. Add the new stage key to the `StageKey` union type
2. Add an entry to the `VARIANTS` record:

```typescript
<stage_key>: [
  {
    id: "<stage_key>_v1",
    weight: 1,
    prompt: <STAGE>_PROMPT,  // import from @/prompts if needed
  },
],
```

If the stage uses a builder function (dynamic prompt), use the sentinel pattern:
```typescript
prompt: "__<stage_key>_dynamic__",
```
And document in a comment that `pipeline.ts` calls the builder when it sees this sentinel.

---

## Step 4 — Write the Zod contract in `src/lib/ai/contracts.ts`

Read `src/lib/ai/contracts.ts` first. Then:
1. Add a Zod schema that validates the AI response for this stage, e.g.:
```typescript
export const <Stage>Schema = z.object({
  // fields matching the TypeScript interface
});
```
2. Add a normalization function `normalize<Stage>(raw: unknown): <StageResult>` that:
   - Parses with `.safeParse()`
   - Returns safe defaults if parsing fails (never throws — the pipeline must not crash on bad AI output)
   - Logs a warning when falling back: `console.warn("[contracts] <stage> normalization fallback", raw)`

---

## Step 5 — Wire the stage into `src/lib/ai/pipeline.ts`

Read `src/lib/ai/pipeline.ts` first. Then:
1. Import the new prompt constant/builder from `@/prompts`
2. Import the new normalizer from `./contracts`
3. Add the stage result type to `PipelineResult`
4. Add a `PipelineStageMeta` entry for the stage in the `stages` array
5. Add the stage execution block following the existing pattern:

```typescript
// Stage N — <Stage name>
const <stage>Variant = pickVariant("<stage_key>");
const <stage>Start = Date.now();
emit({ stage: "<stage_key>", status: "started" });
let <stageResult>: <StageResult>;
let <stage>Degraded = false;
try {
  const prompt = <stage>Variant.prompt === "__<stage_key>_dynamic__"
    ? build<Stage>Prompt(/* args */)
    : <stage>Variant.prompt as string;
  const raw = await withRetry(() =>
    chatJSON<unknown>(env.openai.miniModel, SYSTEM_BASE, prompt)
  );
  <stageResult> = normalize<Stage>(raw);
} catch (err) {
  <stage>Degraded = true;
  <stageResult> = normalize<Stage>(undefined);  // safe fallback
  console.error("[pipeline] <stage_key> stage error", classifyStageError(err));
}
const <stage>Dur = Date.now() - <stage>Start;
emit({ stage: "<stage_key>", status: "completed", durationMs: <stage>Dur, degraded: <stage>Degraded, variantId: <stage>Variant.id });
stages.push({ stage: "<stage_key>", durationMs: <stage>Dur, degraded: <stage>Degraded, variantId: <stage>Variant.id });
```

6. Add `<stageResult>` to the returned `PipelineResult` object.

---

## Step 6 — Verify

After all edits, run:
```
npm run typecheck
```

Fix any TypeScript errors before finishing. Do not run `npm run build`.

---

## Checklist before finishing

- [ ] New type exported from `src/types/report.ts` and added to `CompiledReport`
- [ ] Prompt constant/builder exported from `src/prompts/index.ts`
- [ ] Canary variant registered in `src/lib/ai/canary.ts`
- [ ] Zod schema + normalization function in `src/lib/ai/contracts.ts`
- [ ] Stage wired into `src/lib/ai/pipeline.ts` with SSE emit, retry, degraded fallback
- [ ] `npm run typecheck` passes
