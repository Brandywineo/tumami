CREATE OR REPLACE FUNCTION public.validate_runner_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_is_approved boolean;
BEGIN
  IF NEW.amount < 500 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is KES 500';
  END IF;

  SELECT balance INTO v_balance
  FROM public.wallet_accounts
  WHERE user_id = NEW.user_id;

  IF v_balance IS NULL OR v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.runner_verifications
    WHERE user_id = NEW.user_id
      AND status = 'verified'
  ) INTO v_is_approved;

  IF NOT v_is_approved THEN
    RAISE EXCEPTION 'Only approved runners can request withdrawals';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_customer_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF NEW.amount < 500 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is KES 500';
  END IF;

  SELECT balance INTO v_balance
  FROM public.wallet_accounts
  WHERE user_id = NEW.user_id;

  IF v_balance IS NULL OR v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_runner_withdrawal_before_insert ON public.runner_withdrawals;
CREATE TRIGGER validate_runner_withdrawal_before_insert
BEFORE INSERT ON public.runner_withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.validate_runner_withdrawal();

DROP TRIGGER IF EXISTS validate_customer_withdrawal_before_insert ON public.withdrawal_requests;
CREATE TRIGGER validate_customer_withdrawal_before_insert
BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_customer_withdrawal();