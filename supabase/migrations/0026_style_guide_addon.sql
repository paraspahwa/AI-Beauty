-- Style Guide add-on: full-body image + separate payment SKU

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS body_image_path text,
  ADD COLUMN IF NOT EXISTS is_style_guide_paid boolean NOT NULL DEFAULT false;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'report_unlock';

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_product_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_product_check
  CHECK (product IN ('report_unlock', 'style_guide_addon'));

-- One open order per product per report
CREATE UNIQUE INDEX IF NOT EXISTS payments_report_product_created_idx
  ON public.payments (report_id, product)
  WHERE status = 'created' AND report_id IS NOT NULL;

-- ------------------------------------------------------------
-- RPC: complete style guide add-on payment (webhook authoritative)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_style_guide_webhook_payment(
  p_payment_row_id      uuid,
  p_report_id           uuid,
  p_user_id             uuid,
  p_provider_payment_id text,
  p_raw                 jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.payments
    SET status               = 'paid',
        provider_payment_id  = p_provider_payment_id,
        raw                  = p_raw
  WHERE id = p_payment_row_id
    AND user_id = p_user_id
    AND report_id = p_report_id
    AND product = 'style_guide_addon'
    AND status IN ('created', 'failed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    PERFORM 1
      FROM public.payments
      WHERE id = p_payment_row_id
        AND user_id = p_user_id
        AND report_id = p_report_id
        AND product = 'style_guide_addon'
        AND status = 'paid';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Webhook style guide payment row not eligible for completion';
    END IF;
  END IF;

  UPDATE public.reports
    SET is_style_guide_paid = true
  WHERE id = p_report_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Webhook style guide report ownership invariant failed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_style_guide_webhook_payment(uuid, uuid, uuid, text, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.complete_style_guide_webhook_payment(uuid, uuid, uuid, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.complete_style_guide_webhook_payment(uuid, uuid, uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_style_guide_webhook_payment(uuid, uuid, uuid, text, jsonb) TO service_role;

-- ------------------------------------------------------------
-- RPC: test-mode style guide payment (verify endpoint)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_style_guide_payment(
  p_payment_row_id      uuid,
  p_report_id           uuid,
  p_user_id             uuid,
  p_provider_payment_id text,
  p_provider_signature  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.payments
    SET status               = 'paid',
        provider_payment_id  = p_provider_payment_id,
        provider_signature   = p_provider_signature
  WHERE id = p_payment_row_id
    AND user_id = p_user_id
    AND report_id = p_report_id
    AND product = 'style_guide_addon'
    AND status IN ('created', 'failed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Style guide payment row not eligible for completion';
  END IF;

  UPDATE public.reports
    SET is_style_guide_paid = true
  WHERE id = p_report_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Report ownership/status invariant failed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_style_guide_payment(uuid, uuid, uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.complete_style_guide_payment(uuid, uuid, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.complete_style_guide_payment(uuid, uuid, uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_style_guide_payment(uuid, uuid, uuid, text, text) TO service_role;
