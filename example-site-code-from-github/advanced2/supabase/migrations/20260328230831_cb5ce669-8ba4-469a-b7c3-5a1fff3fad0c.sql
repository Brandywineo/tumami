CREATE OR REPLACE FUNCTION public.protect_errand_financial_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role API calls
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow SECURITY DEFINER functions (run as postgres owner)
  IF current_user = 'postgres' THEN
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
$function$;