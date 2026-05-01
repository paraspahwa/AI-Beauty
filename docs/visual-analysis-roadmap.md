# Visual Analysis Roadmap

## Phase 0 (Now): Reliability and Deterministic Contracts

### Ticket P0-1: Deterministic output contract
- Priority: P0
- Effort: 1.5-2.5 days
- Dependencies: none
- Deliverables:
  - Runtime validation and normalization for all AI outputs.
  - Deterministic JSON shape before DB writes.
- Definition of done:
  - No malformed AI JSON reaches `reports` columns.
  - Pipeline returns a stable object shape in all successful runs.

### Ticket P0-2: Confidence gating baseline
- Priority: P0
- Effort: 1-1.5 days
- Dependencies: P0-1
- Deliverables:
  - Face-shape confidence threshold for shape-conditioned recommendations.
  - Generic fallback path for hairstyle and spectacles when confidence is low.
- Definition of done:
  - Low-confidence cases avoid brittle shape-specific advice.
  - Pipeline does not fail only because confidence is low.

### Ticket P0-3: Failure taxonomy and safe degradation
- Priority: P0
- Effort: 1.5-2 days
- Dependencies: P0-1
- Deliverables:
  - Standardized stage error categories.
  - Partial-stage fallback handling where safe.
- Definition of done:
  - Stage failures have actionable logs and clear categories.

### Ticket P0-4: Contract tests
- Priority: P0
- Effort: 1.5-2 days
- Dependencies: P0-1, P0-2
- Deliverables:
  - Golden tests for malformed enums, invalid hex, missing arrays.
- Definition of done:
  - CI passes with schema and gating tests.

## Phase 1: Quality and Operational Controls

### Ticket P1-1: Prompt hardening
- Priority: P1
- Effort: 0.5-1 day
- Dependencies: P0-1

### Ticket P1-2: Rekognition-assisted confidence blend
- Priority: P1
- Effort: 1-2 days
- Dependencies: P0-2

### Ticket P1-3: Expose uncertainty metadata in API/UI
- Priority: P1
- Effort: 1-1.5 days
- Dependencies: P0-2

### Ticket P1-4: Reliability and cost metrics
- Priority: P1
- Effort: 1-2 days
- Dependencies: P0-3

## Later Phases (After Stable Launch)
- Async image generation jobs for visual try-ons.
- Visual assets schema and signed URL distribution.
- Prompt/model canary and evaluation harness.
- Personalized recommendation memory loop.

## Recommended rollout order
1. P0-1
2. P0-2
3. P0-3
4. P0-4
5. P1-1
6. P1-2
7. P1-3
8. P1-4
