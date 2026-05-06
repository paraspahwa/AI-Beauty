-- Migration 0015: Atomic color swatch slot update RPC
--
-- When 6 parallel color swatch generation calls all complete around the same
-- time, each read-then-write cycle can overwrite the others' results.
-- This function uses a row-level lock (FOR UPDATE) so concurrent calls
-- are serialized at the DB level — no slot overwrites each other.

CREATE OR REPLACE FUNCTION atomic_update_color_swatch_slot(
  p_report_id uuid,
  p_user_id   uuid,
  p_slot      integer,   -- 0–5
  p_slot_data jsonb      -- { path, status, mime, error }
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_va           jsonb;
  v_swatches     jsonb;
  v_len          integer;
  v_new_swatches jsonb;
  i              integer;
BEGIN
  -- Lock the row so concurrent slot writers are serialised
  SELECT visual_assets
  INTO   v_va
  FROM   reports
  WHERE  id = p_report_id AND user_id = p_user_id
  FOR UPDATE;

  v_swatches := COALESCE(v_va -> 'assets' -> 'colorSwatchPreviews', '[]'::jsonb);
  v_len      := jsonb_array_length(v_swatches);

  -- Pad with JSON nulls if array is shorter than the target slot
  v_new_swatches := v_swatches;
  FOR i IN v_len .. p_slot - 1 LOOP
    v_new_swatches := v_new_swatches || 'null'::jsonb;
  END LOOP;

  -- Insert or replace the target slot
  IF p_slot < jsonb_array_length(v_new_swatches) THEN
    v_new_swatches := jsonb_set(v_new_swatches, ARRAY[p_slot::text], p_slot_data);
  ELSE
    v_new_swatches := v_new_swatches || p_slot_data;
  END IF;

  -- Write back with the updated swatches array
  UPDATE reports
  SET visual_assets = jsonb_set(
    COALESCE(
      v_va,
      '{"version":1,"bucket":"","basePath":"","assets":{}}'::jsonb
    ),
    '{assets,colorSwatchPreviews}',
    v_new_swatches,
    true   -- create_missing path
  )
  WHERE id = p_report_id AND user_id = p_user_id;
END;
$$;

-- Grant execute to the service_role (used by Admin client) and authenticated role
GRANT EXECUTE ON FUNCTION atomic_update_color_swatch_slot(uuid, uuid, integer, jsonb)
  TO service_role, authenticated;
