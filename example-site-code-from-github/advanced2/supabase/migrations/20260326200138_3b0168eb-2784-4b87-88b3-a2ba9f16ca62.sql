
-- Create mpesa_payment_attempts table
CREATE TABLE public.mpesa_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('wallet_topup', 'errand_payment')),
  errand_id uuid REFERENCES public.errands(id),
  amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  phone_number text NOT NULL,
  provider text NOT NULL DEFAULT 'mpesa',
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'success', 'failed', 'cancelled', 'timeout')),
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  result_code integer,
  result_desc text,
  account_reference text NOT NULL,
  transaction_desc text NOT NULL,
  callback_payload jsonb,
  raw_request_payload jsonb,
  raw_response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE UNIQUE INDEX idx_mpesa_checkout_request ON public.mpesa_payment_attempts(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX idx_mpesa_merchant_request ON public.mpesa_payment_attempts(merchant_request_id);
CREATE INDEX idx_mpesa_user_id ON public.mpesa_payment_attempts(user_id);
CREATE INDEX idx_mpesa_status ON public.mpesa_payment_attempts(status);
CREATE INDEX idx_mpesa_errand_id ON public.mpesa_payment_attempts(errand_id) WHERE errand_id IS NOT NULL;
CREATE UNIQUE INDEX idx_mpesa_receipt ON public.mpesa_payment_attempts(mpesa_receipt_number) WHERE mpesa_receipt_number IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER trg_mpesa_updated_at BEFORE UPDATE ON public.mpesa_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.mpesa_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mpesa attempts" ON public.mpesa_payment_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mpesa attempts" ON public.mpesa_payment_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all mpesa attempts" ON public.mpesa_payment_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- DB function for processing successful M-Pesa callbacks (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.process_mpesa_callback(
  p_checkout_request_id text,
  p_result_code integer,
  p_result_desc text,
  p_mpesa_receipt text DEFAULT NULL,
  p_callback_payload jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempt RECORD;
  v_wallet RECORD;
BEGIN
  -- Find and lock the payment attempt
  SELECT * INTO v_attempt FROM public.mpesa_payment_attempts
    WHERE checkout_request_id = p_checkout_request_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment attempt not found');
  END IF;

  -- Idempotency: already processed
  IF v_attempt.status IN ('success', 'failed', 'cancelled', 'timeout') THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  -- Update common fields
  UPDATE public.mpesa_payment_attempts SET
    result_code = p_result_code,
    result_desc = p_result_desc,
    mpesa_receipt_number = p_mpesa_receipt,
    callback_payload = p_callback_payload,
    completed_at = now()
  WHERE id = v_attempt.id;

  -- Failed payment
  IF p_result_code != 0 THEN
    UPDATE public.mpesa_payment_attempts SET status = CASE
      WHEN p_result_code = 1032 THEN 'cancelled'
      WHEN p_result_code = 1037 THEN 'timeout'
      ELSE 'failed'
    END WHERE id = v_attempt.id;
    RETURN jsonb_build_object('success', true, 'payment_status', 'failed');
  END IF;

  -- SUCCESS path
  UPDATE public.mpesa_payment_attempts SET status = 'success' WHERE id = v_attempt.id;

  IF v_attempt.purpose = 'wallet_topup' THEN
    -- Credit wallet (exact amount, no fee)
    SELECT * INTO v_wallet FROM public.wallet_accounts WHERE user_id = v_attempt.user_id;
    IF FOUND THEN
      UPDATE public.wallet_accounts SET balance = balance + v_attempt.amount, updated_at = now() WHERE user_id = v_attempt.user_id;
      UPDATE public.profiles SET wallet_balance = wallet_balance + v_attempt.amount WHERE user_id = v_attempt.user_id;
      INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, transaction_type, direction, reference, description, status)
      VALUES (v_wallet.id, v_attempt.user_id, v_attempt.amount, 'topup', 'topup', 'credit',
        COALESCE(p_mpesa_receipt, v_attempt.id::text), 'M-Pesa Top Up — no platform fee', 'completed');
    END IF;

  ELSIF v_attempt.purpose = 'errand_payment' AND v_attempt.errand_id IS NOT NULL THEN
    -- Update errand
    UPDATE public.errands SET status = 'paid', errand_payment_status = 'paid', updated_at = now()
      WHERE id = v_attempt.errand_id;
    INSERT INTO public.errand_status_history (errand_id, status, changed_by)
      VALUES (v_attempt.errand_id, 'paid', v_attempt.user_id);
    -- Record platform earning (5% transaction fee)
    IF v_attempt.fee_amount > 0 THEN
      INSERT INTO public.platform_earnings (source_type, source_reference_id, amount, description)
      VALUES ('transaction_fee', v_attempt.errand_id, v_attempt.fee_amount,
        '5% transaction fee via M-Pesa STK');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'payment_status', 'success');
END;
$$;
