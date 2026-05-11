-- Migration 0017: Atomic preview slot update RPC
--
-- Glasses and hairstyle previews suffer the same concurrent write race as
-- color swatches: 3 parallel slot requests each read visual_assets, then
-- overwrite each other.  This RPC serialises updates with FOR UPDATE so
-- every slot write is isolated.

CREATE OR REPLACE FUNCTION atomic_update_preview_slot(
  p_report_id  uuid,
  p_user_id    uuid,
  p_section    text,      -- 'glassesPreviews' | 'hairstylePreviews'
  p_slot       integer,   -- 0-4
  p_slot_data  jsonb      -- { path, status, mime, error, styleName? }
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_va       jsonb;
  v_previews jsonb;
  v_len      integer;
  v_new      jsonb;
  i          integer;
BEGIN
  -- Lock the row to serialise concurrent slot writers
  SELECT visual_assets
  INTO   v_va
  FROM   reports
  WHERE  id = p_report_id AND user_id = p_user_id
  FOR UPDATE;

  v_previews := COALESCE(v_va -> 'assets' -> p_section, '[]'::jsonb);
  v_len      := jsonb_array_length(v_previews);

  -- Pad array with nulls up to the target slot index
  v_new := v_previews;
  FOR i IN v_len .. p_slot - 1 LOOP
	v_new := v_new || 'null'::jsonb;
  END LOOP;

  -- Insert or replace the slot
  IF p_slot < jsonb_array_length(v_new) THEN
	v_new := jsonb_set(v_new, ARRAY[p_slot::text], p_slot_data);
  ELSE
	v_new := v_new || p_slot_data;
  END IF;

  -- Write back atomically
  UPDATE reports
  SET visual_assets = jsonb_set(
	COALESCE(v_va, '{"version":1,"bucket":"","basePath":"","assets":{}}'::jsonb),
	ARRAY['assets', p_section],
	v_new,
	true
  )
  WHERE id = p_report_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION atomic_update_preview_slot(uuid, uuid, text, integer, jsonb)
  TO service_role, authenticated;
