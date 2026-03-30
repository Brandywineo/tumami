
-- Admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  related_user_id uuid,
  related_entity_id uuid,
  related_entity_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin notifications"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert admin notifications"
  ON public.admin_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- User notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_entity_id uuid,
  related_entity_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can insert user notifications"
  ON public.user_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Function to create admin notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type text, p_title text, p_message text,
  p_priority text DEFAULT 'normal',
  p_related_user_id uuid DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL,
  p_related_entity_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, priority, related_user_id, related_entity_id, related_entity_type)
  VALUES (p_type, p_title, p_message, p_priority, p_related_user_id, p_related_entity_id, p_related_entity_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Trigger: notify admin on new runner application
CREATE OR REPLACE FUNCTION public.notify_admin_runner_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'under_review' AND (OLD IS NULL OR OLD.status != 'under_review') THEN
    PERFORM public.create_admin_notification(
      'runner_application', 'New Runner Application',
      'Runner application from ' || NEW.full_name || ' is pending review.',
      'high', NEW.user_id, NEW.id, 'runner_verification'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_runner_application
  AFTER INSERT OR UPDATE ON public.runner_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_runner_application();

-- Trigger: notify admin on new manual payment
CREATE OR REPLACE FUNCTION public.notify_admin_manual_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    PERFORM public.create_admin_notification(
      'manual_payment', 'New Manual Deposit',
      'Manual M-Pesa deposit of KES ' || NEW.amount || ' pending. Code: ' || NEW.mpesa_code,
      'high', NEW.user_id, NEW.id, 'manual_payment'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_manual_payment
  AFTER INSERT OR UPDATE ON public.manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_manual_payment();

-- Trigger: notify admin on new withdrawal
CREATE OR REPLACE FUNCTION public.notify_admin_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    PERFORM public.create_admin_notification(
      'withdrawal', 'New Withdrawal Request',
      'Withdrawal of KES ' || NEW.amount || ' requested.',
      'high', NEW.user_id, NEW.id, 'withdrawal'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_withdrawal_request
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_withdrawal();

CREATE TRIGGER trg_notify_admin_runner_withdrawal
  AFTER INSERT ON public.runner_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_withdrawal();

-- Trigger: notify admin on new dispute
CREATE OR REPLACE FUNCTION public.notify_admin_dispute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD IS NULL OR OLD.status != 'open') THEN
    PERFORM public.create_admin_notification(
      'dispute', 'New Dispute Opened',
      'A ' || NEW.dispute_type || ' dispute has been opened.',
      'high', NEW.opened_by_user_id, NEW.id, 'dispute'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_dispute
  AFTER INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_dispute();

-- Trigger: notify user on verification status change
CREATE OR REPLACE FUNCTION public.notify_user_verification_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'under_review' AND (OLD IS NULL OR OLD.status != 'under_review') THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
    VALUES (NEW.user_id, 'runner_application', 'Application Received', 'Your runner application is under review.', NEW.id, 'runner_verification');
  ELSIF OLD IS NOT NULL AND NEW.status = 'verified' AND OLD.status != 'verified' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
    VALUES (NEW.user_id, 'runner_approved', 'Application Approved! 🎉', 'You can now accept errands on Tumame.', NEW.id, 'runner_verification');
  ELSIF OLD IS NOT NULL AND NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
    VALUES (NEW.user_id, 'runner_rejected', 'Application Not Approved', COALESCE('Reason: ' || NEW.rejection_reason, 'Please review and resubmit.'), NEW.id, 'runner_verification');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_user_verification
  AFTER INSERT OR UPDATE ON public.runner_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_verification_status();

-- Trigger: notify user on errand status change
CREATE OR REPLACE FUNCTION public.notify_user_errand_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'assigned' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (NEW.customer_id, 'errand_assigned', 'Runner Assigned', 'A runner has been assigned to: ' || NEW.title, NEW.id, 'errand');
    ELSIF NEW.status = 'in_progress' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (NEW.customer_id, 'errand_update', 'Errand In Progress', '"' || NEW.title || '" is now in progress.', NEW.id, 'errand');
    ELSIF NEW.status = 'awaiting_confirmation' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (NEW.customer_id, 'errand_confirm', 'Confirm Completion', 'Runner marked "' || NEW.title || '" as done. Please confirm.', NEW.id, 'errand');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (NEW.customer_id, 'errand_completed', 'Errand Completed ✅', '"' || NEW.title || '" has been completed.', NEW.id, 'errand');
      IF NEW.runner_id IS NOT NULL THEN
        INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
        VALUES (NEW.runner_id, 'errand_completed', 'Errand Completed ✅', '"' || NEW.title || '" completed. Payment credited.', NEW.id, 'errand');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_user_errand_status
  AFTER UPDATE ON public.errands
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_errand_status();

-- Trigger: notify user on manual payment status change
CREATE OR REPLACE FUNCTION public.notify_user_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (NEW.user_id, 'payment_approved', 'Deposit Approved ✅', 'Your deposit of KES ' || NEW.amount || ' has been credited.', NEW.id, 'manual_payment');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (NEW.user_id, 'payment_rejected', 'Deposit Rejected', 'Your deposit of KES ' || NEW.amount || ' was not approved.', NEW.id, 'manual_payment');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_user_payment
  AFTER UPDATE ON public.manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_payment_status();
