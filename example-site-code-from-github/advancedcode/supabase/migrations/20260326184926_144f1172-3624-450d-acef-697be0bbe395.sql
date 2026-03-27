
-- 1. Add wallet_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0;

-- 2. Add columns to errands
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS service_category text;
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS delivery_location text;
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS area_type text DEFAULT 'cbd';
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS transaction_fee_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stk_push';
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS errand_payment_status text DEFAULT 'unpaid';
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS merchant_payment_note text;

-- 3. Add columns to wallet_transactions
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'topup';
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS direction text DEFAULT 'credit';
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS reference_id uuid;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS created_by uuid;

-- 4. Add columns to runner_verifications
ALTER TABLE public.runner_verifications ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE public.runner_verifications ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.runner_verifications ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.runner_verifications ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 5. Platform earnings table
CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_reference_id uuid,
  amount numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view platform earnings" ON public.platform_earnings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert platform earnings" ON public.platform_earnings
  FOR INSERT WITH CHECK (true);

-- 6. Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id uuid NOT NULL,
  opened_by_user_id uuid NOT NULL,
  against_user_id uuid,
  dispute_type text NOT NULL DEFAULT 'other',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT TO authenticated USING (auth.uid() = opened_by_user_id OR auth.uid() = against_user_id);
CREATE POLICY "Users can insert disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = opened_by_user_id);
CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 7. Runner withdrawals table
CREATE TABLE IF NOT EXISTS public.runner_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  payout_method text NOT NULL DEFAULT 'mpesa',
  payout_details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.runner_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own runner withdrawals" ON public.runner_withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own runner withdrawals" ON public.runner_withdrawals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all runner withdrawals" ON public.runner_withdrawals
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update runner withdrawals" ON public.runner_withdrawals
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 8. Business logic: auto-calculate errand fees
CREATE OR REPLACE FUNCTION public.calculate_errand_fees()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.transaction_fee_amount := ROUND(NEW.base_amount * 0.05, 2);
  NEW.total_amount := NEW.base_amount + NEW.transaction_fee_amount + NEW.platform_fee;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_errand_fees ON public.errands;
CREATE TRIGGER trg_calculate_errand_fees
  BEFORE INSERT OR UPDATE OF base_amount ON public.errands
  FOR EACH ROW EXECUTE FUNCTION public.calculate_errand_fees();

-- 9. Business logic: validate withdrawal minimum and balance
CREATE OR REPLACE FUNCTION public.validate_runner_withdrawal()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_is_approved boolean;
BEGIN
  IF NEW.amount < 500 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is 500 KES';
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id = NEW.user_id;
  IF v_balance IS NULL OR v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.runner_verifications WHERE user_id = NEW.user_id AND status = 'verified'
  ) INTO v_is_approved;
  IF NOT v_is_approved THEN
    RAISE EXCEPTION 'Only approved runners can request withdrawals';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_runner_withdrawal ON public.runner_withdrawals;
CREATE TRIGGER trg_validate_runner_withdrawal
  BEFORE INSERT ON public.runner_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.validate_runner_withdrawal();

-- 10. Function to process wallet payment for errand
CREATE OR REPLACE FUNCTION public.pay_errand_from_wallet(p_errand_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errand RECORD;
  v_balance numeric;
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id AND customer_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found');
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id = p_user_id;
  IF v_balance < v_errand.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Deduct balance
  UPDATE public.profiles SET wallet_balance = wallet_balance - v_errand.total_amount WHERE user_id = p_user_id;

  -- Get wallet account
  SELECT * INTO v_wallet FROM public.wallet_accounts WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, wallet_id, amount, type, description, transaction_type, direction, reference_type, reference_id, status)
  VALUES (p_user_id, v_wallet.id, v_errand.total_amount, 'errand_payment', 'Payment for errand: ' || v_errand.title, 'errand_payment', 'debit', 'errand', p_errand_id, 'completed');

  -- Record platform earning (transaction fee)
  INSERT INTO public.platform_earnings (source_type, source_reference_id, amount, description)
  VALUES ('transaction_fee', p_errand_id, v_errand.transaction_fee_amount, '5% transaction fee on errand');

  -- Update errand payment status
  UPDATE public.errands SET errand_payment_status = 'paid', status = 'open' WHERE id = p_errand_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
