-- Style Guide analysis module (pipeline stage output)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS style_guide jsonb;
