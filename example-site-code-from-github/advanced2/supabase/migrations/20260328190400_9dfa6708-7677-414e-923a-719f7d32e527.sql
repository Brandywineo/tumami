-- 1. Fix privilege escalation: Remove user self-insert on user_roles, create secure function
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.assign_safe_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _role = 'admin' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- 2. Fix errand_status_history public read
DROP POLICY IF EXISTS "Users can view errand history" ON public.errand_status_history;

CREATE POLICY "Participants can view errand history"
  ON public.errand_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.errands
      WHERE errands.id = errand_status_history.errand_id
        AND (errands.customer_id = auth.uid() OR errands.runner_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin')
  );

-- 3. Fix errands open policy: restrict to verified runners
DROP POLICY IF EXISTS "Runners can view open errands" ON public.errands;

CREATE POLICY "Verified runners can view open errands"
  ON public.errands FOR SELECT
  TO authenticated
  USING (
    status = ANY (ARRAY['paid'::errand_status, 'open'::errand_status])
    AND has_role(auth.uid(), 'runner')
  );

-- Admin can view all errands
CREATE POLICY "Admins can view all errands"
  ON public.errands FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admin can update all errands
CREATE POLICY "Admins can update all errands"
  ON public.errands FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. Fix wallet_transactions: remove user INSERT, restrict to service_role
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

CREATE POLICY "Service role can insert transactions"
  ON public.wallet_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 5. Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_errand_fees()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  NEW.transaction_fee_amount := ROUND(NEW.base_amount * 0.05, 2);
  NEW.total_amount := NEW.base_amount + NEW.transaction_fee_amount + NEW.platform_fee;
  RETURN NEW;
END;
$$