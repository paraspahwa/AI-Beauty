-- Phase 5.2: Image hash deduplication
-- Add image_hash column so repeated uploads of the same selfie reuse the
-- existing analysis instead of running the full AI pipeline again.
-- Hash is SHA-256 of the raw image bytes, stored as hex string.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64);

-- Partial index for fast per-user hash lookups (only ready reports are candidates)
CREATE INDEX IF NOT EXISTS reports_image_hash_idx
  ON reports(user_id, image_hash)
  WHERE image_hash IS NOT NULL AND status = 'ready';
