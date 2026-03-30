
-- Function to complete an errand: marks completed, credits runner wallet, records platform earnings
CREATE OR REPLACE FUNCTION public.complete_errand(p_errand_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errand RECORD;
  v_runner_wallet RECORD;
  v_runner_fee numeric;
BEGIN
  -- Verify the errand belongs to this customer
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id AND customer_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found or not yours');
  END IF;

  IF v_errand.status NOT IN ('in_progress', 'awaiting_confirmation') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand cannot be completed in current status');
  END IF;

  -- Mark errand completed
  UPDATE public.errands SET status = 'completed', updated_at = now() WHERE id = p_errand_id;

  -- Insert status history
  INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (p_errand_id, 'completed', p_user_id);

  -- Credit runner if assigned
  IF v_errand.runner_id IS NOT NULL THEN
    -- Create payout record
    INSERT INTO public.payout_records (runner_id, errand_id, amount, status)
    VALUES (v_errand.runner_id, p_errand_id, v_errand.runner_payout, 'pending');

    -- Credit runner wallet
    SELECT * INTO v_runner_wallet FROM public.wallet_accounts WHERE user_id = v_errand.runner_id;
    IF FOUND THEN
      -- Update wallet balance
      UPDATE public.wallet_accounts SET balance = balance + v_errand.runner_payout, updated_at = now() WHERE user_id = v_errand.runner_id;
      UPDATE public.profiles SET wallet_balance = wallet_balance + v_errand.runner_payout WHERE user_id = v_errand.runner_id;

      -- Record wallet transaction
      INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference_type, reference_id, description, status)
      VALUES (v_runner_wallet.id, v_errand.runner_id, v_errand.runner_payout, 'earning', 'earning', 'credit', 'errand', p_errand_id, 'Earning from errand: ' || v_errand.title, 'completed');
    END IF;

    -- Record runner platform fee as platform earning
    v_runner_fee := CEIL(v_errand.base_amount * 0.10);
    INSERT INTO public.platform_earnings (source_type, source_reference_id, amount, description)
    VALUES ('runner_platform_fee', p_errand_id, v_runner_fee, '10% runner platform fee on errand');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to raise a dispute: inserts dispute and optionally marks errand
CREATE OR REPLACE FUNCTION public.raise_dispute(
  p_errand_id uuid, p_user_id uuid, p_against_user_id uuid,
  p_dispute_type text, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user is involved in this errand
  IF NOT EXISTS (
    SELECT 1 FROM public.errands WHERE id = p_errand_id AND (customer_id = p_user_id OR runner_id = p_user_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not involved in this errand');
  END IF;

  -- Insert dispute
  INSERT INTO public.disputes (errand_id, opened_by_user_id, against_user_id, dispute_type, reason)
  VALUES (p_errand_id, p_user_id, p_against_user_id, p_dispute_type, p_reason);

  -- Mark errand status if dispute_type is payment
  IF p_dispute_type = 'payment' THEN
    UPDATE public.errands SET status = 'cancelled', notes = COALESCE(notes, '') || ' [DISPUTED]' WHERE id = p_errand_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
