
-- =========================================================
-- 1. FIX MUTABLE SEARCH PATHS (4 email queue functions)
-- =========================================================

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- =========================================================
-- 2. LOCK DOWN user_roles — explicit deny for non-service roles
-- =========================================================

DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role manages roles" ON public.user_roles;

CREATE POLICY "Only service role can insert roles"
  ON public.user_roles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update roles"
  ON public.user_roles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only service role can delete roles"
  ON public.user_roles FOR DELETE
  TO service_role
  USING (true);

-- =========================================================
-- 3. FIX ERRAND STATUS HISTORY INJECTION
-- =========================================================

DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.errand_status_history;

CREATE POLICY "Only service role can insert status history"
  ON public.errand_status_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =========================================================
-- 4. FIX RUNNER PHONE NUMBER VISIBILITY ON OPEN ERRANDS
-- =========================================================

DROP POLICY IF EXISTS "Verified runners can view open errands" ON public.errands;

CREATE POLICY "Runners can view open errands"
  ON public.errands FOR SELECT
  TO authenticated
  USING (
    (status IN ('paid'::errand_status, 'open'::errand_status))
    AND has_role(auth.uid(), 'runner'::app_role)
  );

CREATE OR REPLACE FUNCTION public.get_available_errands()
RETURNS TABLE (
  id uuid,
  title text,
  service_type text,
  service_category text,
  description text,
  pickup_location text,
  dropoff_location text,
  area_type text,
  base_amount numeric,
  platform_fee numeric,
  total_amount numeric,
  runner_payout numeric,
  status errand_status,
  created_at timestamptz,
  preferred_date text,
  estimated_duration_minutes int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.title, e.service_type, e.service_category, e.description,
         e.pickup_location, e.dropoff_location, e.area_type,
         e.base_amount, e.platform_fee, e.total_amount, e.runner_payout,
         e.status, e.created_at, e.preferred_date, e.estimated_duration_minutes
  FROM public.errands e
  WHERE e.status IN ('paid', 'open')
    AND has_role(auth.uid(), 'runner')
$$;

-- =========================================================
-- 5. LOCK DOWN PAYMENTS TABLE — remove user UPDATE
-- =========================================================

DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;

CREATE POLICY "Only service role can update payments"
  ON public.payments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- 6. LOCK DOWN MANUAL PAYMENTS — remove admin UPDATE, use RPC only
-- =========================================================

DROP POLICY IF EXISTS "Admins can update manual payments" ON public.manual_payments;

CREATE POLICY "Only service role can update manual payments"
  ON public.manual_payments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- 7. SECURE ERRAND STATUS CHANGE RPC WITH TRANSITION VALIDATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_errand_status(
  p_errand_id uuid,
  p_user_id uuid,
  p_new_status errand_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errand RECORD;
  v_is_admin boolean;
  v_allowed boolean := false;
BEGIN
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found');
  END IF;

  v_is_admin := has_role(p_user_id, 'admin');

  IF v_is_admin THEN
    v_allowed := true;
  ELSE
    CASE v_errand.status
      WHEN 'pending_payment' THEN
        v_allowed := (p_new_status = 'paid' AND v_errand.customer_id = p_user_id)
                  OR (p_new_status = 'cancelled' AND v_errand.customer_id = p_user_id);
      WHEN 'paid' THEN
        v_allowed := (p_new_status = 'open' AND v_errand.customer_id = p_user_id)
                  OR (p_new_status = 'cancelled' AND v_errand.customer_id = p_user_id);
      WHEN 'open' THEN
        v_allowed := (p_new_status = 'assigned' AND v_errand.runner_id IS NOT NULL AND v_errand.runner_id = p_user_id)
                  OR (p_new_status = 'cancelled' AND v_errand.customer_id = p_user_id);
      WHEN 'assigned' THEN
        v_allowed := (p_new_status = 'in_progress' AND v_errand.runner_id = p_user_id)
                  OR (p_new_status = 'cancelled' AND v_errand.customer_id = p_user_id);
      WHEN 'in_progress' THEN
        v_allowed := (p_new_status = 'awaiting_confirmation' AND v_errand.runner_id = p_user_id);
      WHEN 'awaiting_confirmation' THEN
        v_allowed := (p_new_status = 'completed' AND v_errand.customer_id = p_user_id);
      ELSE
        v_allowed := false;
    END CASE;
  END IF;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Invalid status transition from ' || v_errand.status || ' to ' || p_new_status);
  END IF;

  UPDATE public.errands SET status = p_new_status, updated_at = now() WHERE id = p_errand_id;
  INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (p_errand_id, p_new_status, p_user_id);

  RETURN jsonb_build_object('success', true);
END;
$$;
