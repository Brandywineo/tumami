
-- Fix the pricing trigger: total_amount should be base_amount + transaction_fee_amount only.
-- platform_fee is the runner's 10% deduction and should NOT be added to client total.
CREATE OR REPLACE FUNCTION public.calculate_errand_fees()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.transaction_fee_amount := CEIL(NEW.base_amount * 0.05);
  NEW.platform_fee := CEIL(NEW.base_amount * 0.10);
  NEW.runner_payout := NEW.base_amount - NEW.platform_fee;
  NEW.total_amount := NEW.base_amount + NEW.transaction_fee_amount;
  RETURN NEW;
END;
$function$;
