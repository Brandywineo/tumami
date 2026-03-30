-- Create a secure function for admin manual payment approval
CREATE OR REPLACE FUNCTION public.approve_manual_payment(p_payment_id uuid, p_admin_id uuid, p_admin_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_wallet RECORD;
BEGIN
  -- Lock and fetch payment
  SELECT * INTO v_payment FROM public.manual_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- Block double approval
  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already processed: ' || v_payment.status);
  END IF;

  -- Update manual payment
  UPDATE public.manual_payments SET
    status = 'approved',
    admin_note = COALESCE(p_admin_note, admin_note),
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_payment_id;

  IF v_payment.purpose = 'wallet_topup' THEN
    -- Credit wallet accounts
    UPDATE public.wallet_accounts SET balance = balance + v_payment.amount, updated_at = now()
    WHERE user_id = v_payment.user_id;

    -- Credit profiles wallet_balance
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_payment.amount, updated_at = now()
    WHERE user_id = v_payment.user_id;

    -- Get wallet for transaction
    SELECT * INTO v_wallet FROM public.wallet_accounts WHERE user_id = v_payment.user_id;
    IF FOUND THEN
      INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference, description, status)
      VALUES (v_wallet.id, v_payment.user_id, v_payment.amount, 'topup', 'topup', 'credit',
        v_payment.mpesa_code, 'Manual M-Pesa Top Up (Till: ' || v_payment.till_number || ')', 'completed');
    END IF;

  ELSIF v_payment.purpose = 'errand_payment' AND v_payment.errand_id IS NOT NULL THEN
    UPDATE public.errands SET status = 'paid', errand_payment_status = 'paid', updated_at = now()
    WHERE id = v_payment.errand_id;

    INSERT INTO public.errand_status_history (errand_id, status, changed_by)
    VALUES (v_payment.errand_id, 'paid', p_admin_id);
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, 'manual_payment_approved', 'manual_payment', p_payment_id,
    jsonb_build_object('amount', v_payment.amount, 'mpesa_code', v_payment.mpesa_code, 'purpose', v_payment.purpose, 'admin_note', p_admin_note));

  RETURN jsonb_build_object('success', true, 'amount', v_payment.amount, 'user_id', v_payment.user_id);
END;
$$;

-- Create reject function too
CREATE OR REPLACE FUNCTION public.reject_manual_payment(p_payment_id uuid, p_admin_id uuid, p_admin_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM public.manual_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already processed: ' || v_payment.status);
  END IF;

  UPDATE public.manual_payments SET
    status = 'rejected',
    admin_note = COALESCE(p_admin_note, admin_note),
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_payment_id;

  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, 'manual_payment_rejected', 'manual_payment', p_payment_id,
    jsonb_build_object('amount', v_payment.amount, 'mpesa_code', v_payment.mpesa_code, 'admin_note', p_admin_note));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.errands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.errand_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.runner_withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.runner_verifications;