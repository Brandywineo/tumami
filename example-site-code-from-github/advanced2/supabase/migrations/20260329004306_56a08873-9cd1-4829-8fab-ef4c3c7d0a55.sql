
-- 1. Add self-assignment prevention to accept_errand
CREATE OR REPLACE FUNCTION public.accept_errand(p_errand_id uuid, p_runner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errand RECORD;
BEGIN
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found');
  END IF;

  IF v_errand.customer_id = p_runner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot accept your own errand');
  END IF;

  IF v_errand.status NOT IN ('paid', 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand is not available for acceptance');
  END IF;

  IF v_errand.runner_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand already assigned');
  END IF;

  IF NOT has_role(p_runner_id, 'runner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an approved runner');
  END IF;

  UPDATE public.errands SET runner_id = p_runner_id, status = 'assigned', updated_at = now() WHERE id = p_errand_id;
  INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (p_errand_id, 'assigned', p_runner_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Update complete_errand to block payout if there's an active dispute
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
  v_has_active_dispute boolean;
BEGIN
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id AND customer_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found or not yours');
  END IF;

  IF v_errand.status NOT IN ('in_progress', 'awaiting_confirmation') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand cannot be completed in current status');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.disputes 
    WHERE errand_id = p_errand_id AND status IN ('open', 'under_review')
  ) INTO v_has_active_dispute;

  IF v_has_active_dispute THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot complete errand while a dispute is active. Resolve the dispute first.');
  END IF;

  UPDATE public.errands SET status = 'completed', updated_at = now() WHERE id = p_errand_id;
  INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (p_errand_id, 'completed', p_user_id);

  IF v_errand.runner_id IS NOT NULL THEN
    INSERT INTO public.payout_records (runner_id, errand_id, amount, status)
    VALUES (v_errand.runner_id, p_errand_id, v_errand.runner_payout, 'pending');

    SELECT * INTO v_runner_wallet FROM public.wallet_accounts WHERE user_id = v_errand.runner_id;
    IF FOUND THEN
      UPDATE public.wallet_accounts SET balance = balance + v_errand.runner_payout, updated_at = now() WHERE user_id = v_errand.runner_id;
      UPDATE public.profiles SET wallet_balance = wallet_balance + v_errand.runner_payout WHERE user_id = v_errand.runner_id;
      INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference_type, reference_id, description, status)
      VALUES (v_runner_wallet.id, v_errand.runner_id, v_errand.runner_payout, 'earning', 'earning', 'credit', 'errand', p_errand_id, 'Earning from errand: ' || v_errand.title, 'completed');
    END IF;

    v_runner_fee := CEIL(v_errand.base_amount * 0.10);
    INSERT INTO public.platform_earnings (source_type, source_reference_id, amount, description)
    VALUES ('runner_platform_fee', p_errand_id, v_runner_fee, '10% runner platform fee on errand');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Add dispute escalation columns
ALTER TABLE public.disputes 
  ADD COLUMN IF NOT EXISTS escalation_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- 4. Update raise_dispute to set escalation timer
CREATE OR REPLACE FUNCTION public.raise_dispute(p_errand_id uuid, p_user_id uuid, p_against_user_id uuid, p_dispute_type text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.errands WHERE id = p_errand_id AND (customer_id = p_user_id OR runner_id = p_user_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not involved in this errand');
  END IF;

  IF p_user_id = p_against_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot raise a dispute against yourself');
  END IF;

  INSERT INTO public.disputes (errand_id, opened_by_user_id, against_user_id, dispute_type, reason, escalation_deadline)
  VALUES (p_errand_id, p_user_id, p_against_user_id, p_dispute_type, p_reason, now() + interval '30 minutes');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Remove insecure payments UPDATE policy
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
