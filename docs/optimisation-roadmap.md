# AI-Beauty Optimisation Roadmap

**Goal:** Reduce cost per report from ~$1.20 → ~$0.15–0.25 (~80% reduction) across 5 phases
without removing any user-facing feature.

---

## Cost Baseline (pre-optimisation)

| Component | Model / Service | Est. Cost |
|-----------|----------------|-----------|
| Face Shape | gpt-4o-mini vision | $0.002 |
| Color Analysis | gpt-4o vision | $0.010 |
| Skin Analysis | gpt-4o vision | $0.010 |
| Features | gpt-4o-mini vision | $0.002 |
| Glasses text | gpt-4o-mini text | $0.0002 |
| Hairstyle text | gpt-4o-mini text | $0.0002 |
| Summary compile | gpt-4o-mini text | $0.0002 |
| AWS Rekognition | DetectFaces ALL | $0.001 |
| Glasses previews (5×) | SDXL inpainting | $0.25–0.50 |
| Hairstyle previews (5×) | SDXL inpainting | $0.25–0.50 |
| Color swatches (12×) | Flux Kontext Fast | $0.18–0.30 |
| **Total** | | **~$0.95–1.35** |

---

## Phase 1 — Quick Wins
**Effort:** 1–2 days | **Risk:** Zero (config/prompt only) | **Deploy:** Individually safe

### Changes
| Step | What | File | Status |
|------|------|------|--------|
| 1.1 | Kill color_v1 canary — set weight 0, color_v2_dominant weight 1 | `src/lib/ai/canary.ts` | ✅ Done |
| 1.2 | Downgrade Color Analysis model: gpt-4o → gpt-4o-mini, temp 0.4 → 0.2 | `src/lib/ai/pipeline.ts` | ✅ Done |
| 1.3 | Downgrade Skin Analysis model: gpt-4o → gpt-4o-mini | `src/lib/ai/pipeline.ts` | ✅ Done |
| 1.4 | Rekognition attributes: ALL → DEFAULT (only bounding box needed) | `src/lib/ai/rekognition.ts` | ✅ Done |
| 1.5 | Image detail: "high" → "low" for all 512px chatJSON vision calls | `src/lib/ai/openai.ts` | ✅ Done |

### After Phase 1
| Component | New Cost |
|-----------|----------|
| Color Analysis | ~$0.002 (was $0.010) |
| Skin Analysis | ~$0.002 (was $0.010) |
| Image tokens | ~$0.001 (was $0.004) |
| **Text AI total** | ~$0.009 (was $0.025) |

**Projected saving: ~$0.016/report on text AI (~64% reduction on LLM costs)**

---

## Phase 2 — Visual Cost Reduction
**Effort:** 2–3 days | **Risk:** Low (UI changes, no pipeline changes)

### Changes
| Step | What | File | Status |
|------|------|------|--------|
| 2.1 | Cap glasses previews 5 → 3; remaining 2 are SVG-only with "Generate" button | `src/lib/ai/replicate-glasses.ts`, `SpectaclesCard.tsx` | ✅ Done |
| 2.2 | Cap hairstyle previews 5 → 3; remaining 2 use SVG overlay | `src/lib/ai/replicate-hair.ts`, `HairstyleCard.tsx` | ✅ Done |
| 2.3 | Color swatches 12 → 6 (best only); avoid colors rendered as CSS circles | `src/lib/ai/color-swatch-v2.ts`, `ColorAnalysisCard.tsx` | ✅ Done |
| 2.4 | Hair color try-on: check storage for existing result before re-generating | `src/app/api/reports/[id]/hair-color/route.ts` | ✅ Done |

### After Phase 2
| Component | New Cost |
|-----------|----------|
| Glasses previews (3×) | ~$0.08–0.15 (was $0.25–0.50) |
| Hairstyle previews (3×) | ~$0.08–0.15 (was $0.25–0.50) |
| Color swatches (6×) | ~$0.09–0.15 (was $0.18–0.30) |

**Projected saving: ~$0.35–0.55/report on Replicate (~45% reduction)**

---

## Phase 3 — SDXL → Flux Kontext Migration
**Effort:** 3–4 days | **Risk:** Medium (requires staging validation)

### Changes
| Step | What | File | Status |
|------|------|------|--------|
| 3.1 | Glasses: replace SDXL + mask geometry with Flux Kontext prompt | `src/lib/ai/replicate-glasses.ts` | ✅ Done |
| 3.2 | Hairstyle: replace SDXL + mask geometry with Flux Kontext prompt | `src/lib/ai/replicate-hair.ts` | ✅ Done |
| 3.3 | Remove `buildHairSvg` overlay in visuals.ts (SDXL workaround, no longer needed) | `src/lib/ai/visuals.ts` | ✅ Done |
| 3.4 | Delete old `replicate-clothing.ts` SDXL path + `visuals/colors` webhook route | `src/lib/ai/replicate-clothing.ts`, `api/webhooks/replicate-clothing` | ✅ Done |

### After Phase 3
- No mask-building code path anywhere in the codebase
- Single image generation library (Flux Kontext) for all visual previews
- ~30% cheaper per prediction vs SDXL
- Better identity preservation (no mask bleed artifacts)

**Projected saving: ~$0.05–0.10/report + major code simplification**

---

## Phase 4 — Quality Improvements (Zero Extra Cost)
**Effort:** 2–3 days | **Risk:** Low (prompt additions only)

### Changes
| Step | What | File | Status |
|------|------|------|--------|
| 4.1 | Feed Rekognition attributes (AgeRange, Smile, EyesOpen, Eyeglasses) into Features prompt | `src/lib/ai/pipeline.ts`, `src/prompts/index.ts` | ✅ Done |
| 4.2 | Display `clothingObservation` field in Color card (returned by AI, currently ignored) | `src/components/report/ColorAnalysisCard.tsx` | ✅ Done |
| 4.3 | Pass eye color + brow shape from Features into Glasses prompt for personalized frame colors | `src/lib/ai/pipeline.ts`, `src/prompts/index.ts` | ✅ Done |
| 4.4 | Split Skin Analysis: vision call for type+concerns only; separate mini text call (no image) for routine | `src/lib/ai/pipeline.ts`, `src/prompts/index.ts` | ✅ Done |

### After Phase 4
- Features card uses hard Rekognition data (currently uses only GPT vision guesses)
- Glasses recommendations are personalized by actual eye color, not just face shape
- Clothing observation surface in UI (currently hidden free data)

**Projected benefit: Higher accuracy, same cost**

---

## Phase 5 — Caching + Architecture
**Effort:** 4–5 days | **Risk:** Medium-High (DB migration, routing changes)

### Changes
| Step | What | File | Status |
|------|------|------|--------|
| 5.1 | Lazy visual generation — trigger visuals only on tab switch, not report open | `src/components/report/ReportLayout.tsx`, `api/reports/[id]/visuals/route.ts` | ✅ Done |
| 5.2 | Image hash deduplication — SHA-256 selfie before pipeline; reuse analysis on match | New DB migration, `src/lib/ai/pipeline.ts` | ✅ Done |
| 5.3 | Replace summary LLM call with deterministic client-side template | `src/components/report/ReportLayout.tsx` | ⬜ Skipped (saves ~$0.0002/report, not worth tradeoff) |
| 5.4 | On-demand glasses/hair previews — generate per style on user click, not auto-trigger all | `api/reports/[id]/visuals/route.ts`, spectacles + hairstyle cards | ✅ Done |

### After Phase 5
- Users who never visit Spectacles or Hairstyle tab pay $0 for those previews
- Duplicate uploads (same selfie) cost nothing after first analysis
- Summary call eliminated entirely

**Projected saving: ~$0.20–0.30/report for avg user (60% of remaining visual spend)**

---

## Cost Summary by Phase

| After Phase | Est. Cost/Report | Reduction vs Baseline |
|-------------|-----------------|----------------------|
| Baseline | ~$1.15 | — |
| Phase 1 ✅ | ~$1.13 | ~2% (text AI small slice) |
| Phase 2 | ~$0.65 | ~43% |
| Phase 3 | ~$0.55 | ~52% |
| Phase 4 | ~$0.55 | same cost, better quality |
| Phase 5 | **~$0.20–0.30** | **~75–80%** |

---

## Legend
- ✅ Done — implemented and committed
- 🔄 In Progress — currently being worked on
- ⬜ Pending — not yet started
