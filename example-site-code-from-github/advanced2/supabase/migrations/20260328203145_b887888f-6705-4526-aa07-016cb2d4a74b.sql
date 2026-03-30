
-- Secure RPC for runner accepting an errand
CREATE OR REPLACE FUNCTION public.accept_errand(p_errand_id uuid, p_runner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_errand RECORD;
BEGIN
  SELECT * INTO v_errand FROM public.errands WHERE id = p_errand_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand not found');
  END IF;

  IF v_errand.status NOT IN ('paid', 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand is not available for acceptance');
  END IF;

  IF v_errand.runner_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Errand already assigned');
  END IF;

  -- Verify caller is an approved runner
  IF NOT has_role(p_runner_id, 'runner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an approved runner');
  END IF;

  UPDATE public.errands SET runner_id = p_runner_id, status = 'assigned', updated_at = now() WHERE id = p_errand_id;
  INSERT INTO public.errand_status_history (errand_id, status, changed_by) VALUES (p_errand_id, 'assigned', p_runner_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Auto-insert initial status history on errand creation
CREATE OR REPLACE FUNCTION public.log_initial_errand_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.errand_status_history (errand_id, status, changed_by)
  VALUES (NEW.id, NEW.status, NEW.customer_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_initial_errand_status ON public.errands;
CREATE TRIGGER trg_log_initial_errand_status
  AFTER INSERT ON public.errands
  FOR EACH ROW
  EXECUTE FUNCTION public.log_initial_errand_status();
