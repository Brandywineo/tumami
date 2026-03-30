
-- Drop the broken policy
DROP POLICY IF EXISTS "Owners can update errands safely" ON public.errands;

-- Use a trigger-based approach to protect financial fields
CREATE OR REPLACE FUNCTION public.protect_errand_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If caller is service_role, allow everything
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Prevent non-service-role from changing financial fields
  IF NEW.base_amount IS DISTINCT FROM OLD.base_amount
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
    OR NEW.runner_payout IS DISTINCT FROM OLD.runner_payout
    OR NEW.transaction_fee_amount IS DISTINCT FROM OLD.transaction_fee_amount
    OR NEW.errand_payment_status IS DISTINCT FROM OLD.errand_payment_status
  THEN
    RAISE EXCEPTION 'Cannot modify financial fields on errands';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_errand_financials ON public.errands;
CREATE TRIGGER trg_protect_errand_financials
  BEFORE UPDATE ON public.errands
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_errand_financial_fields();

-- Simple ownership-based update policy (financial protection via trigger)
CREATE POLICY "Owners can update errands"
  ON public.errands FOR UPDATE
  TO public
  USING (auth.uid() = customer_id OR auth.uid() = runner_id);
