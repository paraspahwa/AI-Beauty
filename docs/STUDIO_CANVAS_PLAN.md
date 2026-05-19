# AI Studio Canvas — Implementation Plan

## Overview
Create standalone Studio Canvas feature allowing users to try virtual try-ons without full report generation.

**Features:**
- Free 3 gens/month for any user (canvas-only)
- Paid users get canvas + 3 report studio gens
- Studio Pro users get unlimited across both
- No color palette required (manual pick or quick-scan)

---

## Phase 1: Database Schema (Migration 0021)

### New Table: `studio_canvases`
```sql
CREATE TABLE studio_canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selfie_path TEXT NOT NULL,                    -- uploaded photo path
  color_palette JSONB,                         -- optional user-picked palette
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user listing
CREATE INDEX IF NOT EXISTS studio_canvases_user_created_idx 
  ON studio_canvases (user_id, created_at DESC);

-- RLS: Users can only access their own canvases
ALTER TABLE studio_canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_canvases_owner_select"
  ON studio_canvases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "studio_canvases_owner_insert"
  ON studio_canvases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Update: `generated_assets` Table
```sql
-- Add studio_canvas_id column (nullable)
ALTER TABLE generated_assets 
  ADD COLUMN studio_canvas_id UUID 
    REFERENCES studio_canvases(id) ON DELETE CASCADE;

-- Create index for canvas lookup
CREATE INDEX IF NOT EXISTS generated_assets_canvas_idx 
  ON generated_assets (studio_canvas_id);

-- Make report_id NOT NULL but allow canvas-only generations
-- (logic: report_id XOR studio_canvas_id must be set)
```

### Update: Quota RPC `get_studio_entitlement`
Current behavior: Tracks used_gens per report per month
New behavior: 
- Free tier: 3 gens/month (canvas only)
- Report tier: 3 gens/month (report + canvas combined)
- Studio Pro: Unlimited

```sql
-- New RPC: get_canvas_quota(p_user)
-- Returns: { tier, remaining_gens, used_gens, ... }
-- Logic: COUNT(generated_assets WHERE studio_canvas_id IS NOT NULL AND user_id = p_user)
```

---

## Phase 2: API Routes

### Route 1: `POST /api/studio/upload`
**Purpose:** Upload photo → Create canvas session

```
Request:
{
  "file": FormData with image/*, max 8MB
}

Response:
{
  "canvasId": "uuid",
  "photoUrl": "signed-url or data:uri",
  "quota": { tier, remaining, used }
}
```

**Logic:**
1. Auth check: User must exist
2. Quota check: If free user, allow only 1 canvas per day (or allow multiple but limit gens)
3. Upload to storage: `selfies/canvases/{user_id}/{canvas_id}_{timestamp}.jpg`
4. Insert row into `studio_canvases`
5. Return canvas ID + photo URL

---

### Route 2: `POST /api/studio/generate`
**Purpose:** Generate makeup/hair/clothing for canvas or report

```
Request:
{
  "contextType": "canvas" | "report",
  "contextId": "canvas_id" | "report_id",
  "mode": "makeup" | "hair" | "clothing",
  "options": { ... mode-specific options ... }
}

Response:
{
  "assetId": "uuid",
  "hdUrl": "signed-url",
  "lowResUrl": "signed-url",
  "remainingQuota": number
}
```

**Logic:**
1. Auth + resolve context (canvas or report)
2. Quota check: `try_consume_generation(user_id)` 
3. Call existing generate function (makeup/hair/clothing)
4. Store result in `generated_assets` with `studio_canvas_id` OR `report_id`
5. Return asset with quota

---

### Route 3: `GET /api/studio/vault`
**Purpose:** List all user's generated assets across canvases + reports

```
Request:
{
  "limit": 50,
  "offset": 0,
  "filter": "all" | "canvas" | "report"
}

Response:
{
  "assets": [
    {
      "id": "uuid",
      "sourceType": "canvas" | "report",
      "sourceId": "uuid",
      "tool": "makeup" | "hair" | "clothing",
      "hdUrl": "signed-url",
      "createdAt": "ISO date",
      "savedByUser": boolean
    }
  ],
  "total": number
}
```

---

## Phase 3: Frontend Pages & Components

### Page 1: `/studio` (Studio Canvas Main)
**URL:** `https://renovaara.com/studio`

**Layout:**
```
┌─────────────────────────────────────┐
│  AI Beauty Studio Canvas            │
│  Try makeup, hair, clothing try-ons │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Upload Photo (or use existing)      │
│  [Upload Zone] → [Preview]          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Mode Tabs                          │
│  [Makeup] [Hair] [Clothing] [AR]    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Try-On Interface                   │
│  (reuse AIBeautyStudio component)   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  CTA: "Get Full Analysis" → /upload │
└─────────────────────────────────────┘
```

**Features:**
- No auth required to view (but login for upload)
- Direct access to makeup/hair/clothing modes
- 3 free gens/month (banner shows quota)
- Option to manually pick color palette
- "Upgrade to Studio Pro" for unlimited

---

### Page 2: `/dashboard/studio-vault`
**Purpose:** Gallery of all generated assets

**Layout:**
```
┌─────────────────────────────────────┐
│  My Studio Vault                    │
│  [All] [Canvas] [Reports]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Grid of generated assets:           │
│ - Image thumbnail                   │
│ - Tool label (makeup, hair, etc)    │
│ - Date created                      │
│ - [Download] [Delete] [Re-generate] │
└─────────────────────────────────────┘
```

---

### Component Refactoring: `AIBeautyStudio`
**Current:** Requires `reportId`, `photoUrl`, `colorAnalysis`
**New:** Accept either report OR canvas context

```tsx
interface Props {
  contextType: "report" | "canvas";
  contextId: string;           // report_id or canvas_id
  photoUrl: string;
  isPaid: boolean;
  studioEntitlement?: StudioEntitlement;
  colorAnalysis?: ColorAnalysisResult;
  canvasColorPalette?: string[];  // for canvas mode
  initialSourceAssetId?: string | null;
}
```

**Changes:**
- Accept canvas context
- Pass `contextType` and `contextId` to `POST /api/studio/generate`
- Handle optional `colorAnalysis` (not required for canvas)

---

## Phase 4: Dashboard Integration

### Update: `src/app/dashboard/page.tsx`
**Add Quick Access:**
```tsx
<Link href="/studio" className="...">
  <Sparkles className="..." />
  <span>Try Studio Canvas</span>
</Link>
```

### Create: Quick Stats Card
```tsx
<StudioVaultCard>
  {/*Generated assets count, recent gens, link to vault*/}
</StudioVaultCard>
```

---

## Implementation Sequence

| # | Task | File | Est. Time |
|---|------|------|-----------|
| 1 | Create migration 0021 | `supabase/migrations/0021_studio_canvas.sql` | 10 min |
| 2 | Create `POST /api/studio/upload` | `src/app/api/studio/upload/route.ts` | 20 min |
| 3 | Create `POST /api/studio/generate` | `src/app/api/studio/generate/route.ts` | 25 min |
| 4 | Create `GET /api/studio/vault` | `src/app/api/studio/vault/route.ts` | 20 min |
| 5 | Refactor `AIBeautyStudio` props | `src/components/report/AIBeautyStudio.tsx` | 15 min |
| 6 | Create `/studio` page | `src/app/studio/page.tsx` | 30 min |
| 7 | Create `/dashboard/studio-vault` | `src/app/dashboard/studio-vault/page.tsx` | 25 min |
| 8 | Update dashboard navigation | `src/app/dashboard/page.tsx` | 10 min |
| 9 | Test quota logic + auth | Manual testing | 15 min |

**Total: ~170 minutes (~3 hours)**

---

## Key Decisions

✅ **No color palette required for canvas** — Manual picker (future: quick 5s scan)
✅ **Separate quota tracking** — RPC handles free vs paid logic
✅ **Reuse existing try-on logic** — No duplication in generation endpoints
✅ **Vault unifies all assets** — Canvas + Report generations in one gallery
✅ **Natural upsell flow** — "Try 3 free gens" → "Get full report" → "Unlimited studio"

---

## Success Criteria

- ✅ Free users can upload photo + generate 3 try-ons
- ✅ Paid users get canvas + report studio gens
- ✅ Studio Pro gets unlimited
- ✅ All assets indexed in vault
- ✅ No breaking changes to existing report studio
- ✅ Quota system enforced at RPC level
