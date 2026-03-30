
-- 1. Update raise_dispute to prevent duplicate active disputes per errand
CREATE OR REPLACE FUNCTION public.raise_dispute(p_errand_id uuid, p_user_id uuid, p_against_user_id uuid, p_dispute_type text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.errands WHERE id = p_errand_id AND (customer_id = p_user_id OR runner_id = p_user_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not involved in this errand');
  END IF;

  IF p_user_id = p_against_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot raise a dispute against yourself');
  END IF;

  -- Prevent duplicate active dispute on same errand
  IF EXISTS (
    SELECT 1 FROM public.disputes WHERE errand_id = p_errand_id AND status IN ('open', 'under_review')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This errand already has an active dispute');
  END IF;

  INSERT INTO public.disputes (errand_id, opened_by_user_id, against_user_id, dispute_type, reason, escalation_deadline)
  VALUES (p_errand_id, p_user_id, p_against_user_id, p_dispute_type, p_reason, now() + interval '30 minutes');

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2. Create resolve_dispute_settlement function for proper double-entry accounting
CREATE OR REPLACE FUNCTION public.resolve_dispute_settlement(
  p_dispute_id uuid,
  p_admin_id uuid,
  p_favor text, -- 'client' or 'runner'
  p_resolution_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dispute RECORD;
  v_errand RECORD;
  v_runner_wallet RECORD;
  v_client_wallet RECORD;
  v_payout_exists boolean;
BEGIN
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dispute not found');
  END IF;

  IF v_dispute.status NOT IN ('open', 'under_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dispute already resolved');
  END IF;

  SELECT * INTO v_errand FROM public.errands WHERE id = v_dispute.errand_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Related errand not found');
  END IF;

  -- Check if runner was already paid
  SELECT EXISTS (
    SELECT 1 FROM public.payout_records WHERE errand_id = v_errand.id AND runner_id = v_errand.runner_id AND status IN ('pending', 'released')
  ) INTO v_payout_exists;

  IF p_favor = 'client' THEN
    -- Resolve in favor of client: refund client, debit runner if already paid
    IF v_payout_exists AND v_errand.runner_id IS NOT NULL THEN
      -- Debit runner
      SELECT * INTO v_runner_wallet FROM public.wallet_accounts WHERE user_id = v_errand.runner_id;
      IF FOUND THEN
        UPDATE public.wallet_accounts SET balance = balance - v_errand.runner_payout, updated_at = now() WHERE user_id = v_errand.runner_id;
        UPDATE public.profiles SET wallet_balance = wallet_balance - v_errand.runner_payout WHERE user_id = v_errand.runner_id;
        INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference_type, reference_id, description, status)
        VALUES (v_runner_wallet.id, v_errand.runner_id, v_errand.runner_payout, 'dispute_debit', 'dispute_debit', 'debit', 'dispute', p_dispute_id, 'Dispute resolved in favor of client — payout reversed', 'completed');
      END IF;
      -- Mark payout as failed
      UPDATE public.payout_records SET status = 'failed', updated_at = now() WHERE errand_id = v_errand.id AND runner_id = v_errand.runner_id;
    END IF;

    -- Credit client (refund the total_amount they paid)
    SELECT * INTO v_client_wallet FROM public.wallet_accounts WHERE user_id = v_errand.customer_id;
    IF FOUND THEN
      UPDATE public.wallet_accounts SET balance = balance + v_errand.total_amount, updated_at = now() WHERE user_id = v_errand.customer_id;
      UPDATE public.profiles SET wallet_balance = wallet_balance + v_errand.total_amount WHERE user_id = v_errand.customer_id;
      INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference_type, reference_id, description, status)
      VALUES (v_client_wallet.id, v_errand.customer_id, v_errand.total_amount, 'dispute_refund', 'refund', 'credit', 'dispute', p_dispute_id, 'Dispute resolved in your favor — full refund', 'completed');
    END IF;

    -- Update errand status
    UPDATE public.errands SET status = 'cancelled', updated_at = now() WHERE id = v_errand.id;
    INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (v_errand.id, 'cancelled', p_admin_id);

  ELSIF p_favor = 'runner' THEN
    -- Resolve in favor of runner: runner keeps/gets payout
    IF NOT v_payout_exists AND v_errand.runner_id IS NOT NULL THEN
      -- Runner was NOT yet paid — pay them now
      SELECT * INTO v_runner_wallet FROM public.wallet_accounts WHERE user_id = v_errand.runner_id;
      IF FOUND THEN
        INSERT INTO public.payout_records (runner_id, errand_id, amount, status)
        VALUES (v_errand.runner_id, v_errand.id, v_errand.runner_payout, 'released');

        UPDATE public.wallet_accounts SET balance = balance + v_errand.runner_payout, updated_at = now() WHERE user_id = v_errand.runner_id;
        UPDATE public.profiles SET wallet_balance = wallet_balance + v_errand.runner_payout WHERE user_id = v_errand.runner_id;
        INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference_type, reference_id, description, status)
        VALUES (v_runner_wallet.id, v_errand.runner_id, v_errand.runner_payout, 'earning', 'earning', 'credit', 'dispute', p_dispute_id, 'Dispute resolved in your favor — payout released', 'completed');
      END IF;
    END IF;

    -- Mark errand completed
    UPDATE public.errands SET status = 'completed', updated_at = now() WHERE id = v_errand.id;
    INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (v_errand.id, 'completed', p_admin_id);

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid favor value. Must be client or runner');
  END IF;

  -- Update dispute record
  UPDATE public.disputes SET
    status = CASE WHEN p_favor = 'client' THEN 'resolved_for_client' ELSE 'resolved_for_runner' END,
    resolution_note = p_resolution_note,
    resolved_at = now(),
    resolved_by = p_admin_id
  WHERE id = p_dispute_id;

  -- Notify both parties
  INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
  VALUES (v_errand.customer_id, 'dispute_resolved', 'Dispute Resolved',
    CASE WHEN p_favor = 'client' THEN 'The dispute was resolved in your favor. A refund has been credited.' ELSE 'The dispute was resolved in favor of the runner.' END,
    'dispute', p_dispute_id);

  IF v_errand.runner_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (v_errand.runner_id, 'dispute_resolved', 'Dispute Resolved',
      CASE WHEN p_favor = 'runner' THEN 'The dispute was resolved in your favor. Your payout is confirmed.' ELSE 'The dispute was resolved in favor of the client. Your payout has been reversed.' END,
      'dispute', p_dispute_id);
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, 'dispute_resolved', 'dispute', p_dispute_id,
    jsonb_build_object('favor', p_favor, 'note', p_resolution_note, 'errand_id', v_errand.id, 'runner_payout', v_errand.runner_payout, 'client_total', v_errand.total_amount));

  RETURN jsonb_build_object('success', true, 'favor', p_favor);
END;
$function$;

-- 3. Create process_withdrawal_approval function for proper wallet deduction
CREATE OR REPLACE FUNCTION public.process_withdrawal_approval(
  p_withdrawal_id uuid,
  p_admin_id uuid,
  p_source text DEFAULT 'withdrawal_requests' -- or 'runner_withdrawals'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_wallet RECORD;
BEGIN
  IF p_source = 'runner_withdrawals' THEN
    SELECT user_id, amount, status INTO v_user_id, v_amount, v_status FROM public.runner_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  ELSE
    SELECT user_id, amount, status INTO v_user_id, v_amount, v_status FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal already processed: ' || v_status);
  END IF;

  -- Check balance
  SELECT * INTO v_wallet FROM public.wallet_accounts WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance for withdrawal');
  END IF;

  -- Deduct wallet
  UPDATE public.wallet_accounts SET balance = balance - v_amount, updated_at = now() WHERE user_id = v_user_id;
  UPDATE public.profiles SET wallet_balance = wallet_balance - v_amount WHERE user_id = v_user_id;

  -- Record debit transaction
  INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference_type, reference_id, description, status)
  VALUES (v_wallet.id, v_user_id, v_amount, 'withdrawal', 'withdrawal', 'debit', 'withdrawal', p_withdrawal_id, 'Withdrawal approved and processed', 'completed');

  -- Update status to successful
  IF p_source = 'runner_withdrawals' THEN
    UPDATE public.runner_withdrawals SET status = 'successful', reviewed_at = now(), reviewed_by = p_admin_id WHERE id = p_withdrawal_id;
  ELSE
    UPDATE public.withdrawal_requests SET status = 'successful', updated_at = now() WHERE id = p_withdrawal_id;
  END IF;

  -- Notify user
  INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
  VALUES (v_user_id, 'withdrawal_update', 'Withdrawal Successful ✅', 'Your KES ' || v_amount || ' withdrawal has been processed.', 'withdrawal', p_withdrawal_id);

  -- Audit
  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, 'withdrawal_completed', 'withdrawal', p_withdrawal_id,
    jsonb_build_object('amount', v_amount, 'user_id', v_user_id, 'source', p_source));

  RETURN jsonb_build_object('success', true, 'amount', v_amount);
END;
$function$;
