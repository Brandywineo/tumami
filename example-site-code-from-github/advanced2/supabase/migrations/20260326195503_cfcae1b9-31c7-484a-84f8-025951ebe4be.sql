
-- Function to record errand payment via M-Pesa (records platform earning with elevated privileges)
CREATE OR REPLACE FUNCTION public.record_errand_payment(p_errand_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errand RECORD;
BEGIN
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id AND customer_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found');
  END IF;

  -- Update errand status
  UPDATE public.errands SET status = 'paid', errand_payment_status = 'paid', updated_at = now() WHERE id = p_errand_id;

  -- Insert status history
  INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (p_errand_id, 'paid', p_user_id);

  -- Record platform earning for transaction fee
  IF v_errand.transaction_fee_amount > 0 THEN
    INSERT INTO public.platform_earnings (source_type, source_reference_id, amount, description)
    VALUES ('transaction_fee', p_errand_id, v_errand.transaction_fee_amount, '5% transaction fee on errand: ' || v_errand.title);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
