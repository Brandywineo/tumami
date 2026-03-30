
-- =========================================================
-- 1. FIX: User can update own wallet_balance in profiles
--    Replace permissive UPDATE with column-restricted approach
-- =========================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Users can only update non-financial profile fields
-- We use a WITH CHECK that ensures wallet_balance hasn't changed
CREATE POLICY "Users can update own profile safely"
  ON public.profiles FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND wallet_balance = (SELECT wallet_balance FROM public.profiles WHERE user_id = auth.uid())
  );

-- =========================================================
-- 2. FIX: Users can modify financial fields on errands
-- =========================================================

DROP POLICY IF EXISTS "Owners can update errands" ON public.errands;

-- Participants can only update non-financial fields
CREATE POLICY "Owners can update errands safely"
  ON public.errands FOR UPDATE
  TO public
  USING (auth.uid() = customer_id OR auth.uid() = runner_id)
  WITH CHECK (
    (auth.uid() = customer_id OR auth.uid() = runner_id)
    AND base_amount = (SELECT base_amount FROM public.errands WHERE id = errands.id)
    AND total_amount = (SELECT total_amount FROM public.errands WHERE id = errands.id)
    AND platform_fee = (SELECT platform_fee FROM public.errands WHERE id = errands.id)
    AND runner_payout = (SELECT runner_payout FROM public.errands WHERE id = errands.id)
    AND transaction_fee_amount = (SELECT transaction_fee_amount FROM public.errands WHERE id = errands.id)
    AND errand_payment_status IS NOT DISTINCT FROM (SELECT errand_payment_status FROM public.errands WHERE id = errands.id)
  );

-- Service role can update anything on errands (for SECURITY DEFINER functions)
CREATE POLICY "Service role can update all errand fields"
  ON public.errands FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- 3. FIX: Explicitly deny user-level updates on wallet_accounts
-- =========================================================

-- Already no user UPDATE policy exists, but add explicit service-role-only
CREATE POLICY "Only service role can update wallets"
  ON public.wallet_accounts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- 4. Harden has_role by creating a version that uses auth.uid()
-- =========================================================

-- The existing has_role is used in policies with auth.uid() passed in,
-- which is safe because auth.uid() is server-evaluated.
-- Add explicit comment for documentation.
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER: Always call with auth.uid() as first arg in RLS policies. user_roles writes restricted to service_role only.';
