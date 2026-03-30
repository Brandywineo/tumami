
-- Drop any existing triggers first
DROP TRIGGER IF EXISTS trg_notify_admin_runner_application ON public.runner_verifications;
DROP TRIGGER IF EXISTS trg_notify_admin_manual_payment ON public.manual_payments;
DROP TRIGGER IF EXISTS trg_notify_admin_withdrawal_request ON public.withdrawal_requests;
DROP TRIGGER IF EXISTS trg_notify_admin_runner_withdrawal ON public.runner_withdrawals;
DROP TRIGGER IF EXISTS trg_notify_admin_dispute_opened ON public.disputes;
DROP TRIGGER IF EXISTS trg_notify_user_errand_status ON public.errands;
DROP TRIGGER IF EXISTS trg_notify_user_verification_status ON public.runner_verifications;
DROP TRIGGER IF EXISTS trg_notify_user_payment_status ON public.manual_payments;
DROP TRIGGER IF EXISTS trg_notify_user_withdrawal_status ON public.withdrawal_requests;
DROP TRIGGER IF EXISTS trg_notify_admin_new_user ON public.profiles;

-- 1. Admin: runner application submitted
CREATE OR REPLACE FUNCTION public.notify_admin_runner_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'under_review' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'under_review') THEN
    INSERT INTO admin_notifications (type, title, message, priority, related_entity_type, related_entity_id, related_user_id)
    VALUES ('runner_application', 'New Runner Application',
      'Runner application from ' || COALESCE(NEW.full_name, 'Unknown') || COALESCE(' (@' || NEW.username || ')', '') || ' is pending review.',
      'high', 'runner_verification', NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_admin_runner_application AFTER INSERT OR UPDATE ON public.runner_verifications FOR EACH ROW EXECUTE FUNCTION public.notify_admin_runner_application();

-- 2. Admin: manual payment submitted
CREATE OR REPLACE FUNCTION public.notify_admin_manual_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT full_name INTO v_name FROM profiles WHERE user_id = NEW.user_id LIMIT 1;
    INSERT INTO admin_notifications (type, title, message, priority, related_entity_type, related_entity_id, related_user_id)
    VALUES ('manual_payment', 'New Manual Deposit',
      'KES ' || NEW.amount || ' deposit from ' || COALESCE(v_name, 'a user') || ' (M-Pesa: ' || NEW.mpesa_code || ') pending approval.',
      'high', 'manual_payment', NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_admin_manual_payment AFTER INSERT OR UPDATE ON public.manual_payments FOR EACH ROW EXECUTE FUNCTION public.notify_admin_manual_payment();

-- 3. Admin: withdrawal request
CREATE OR REPLACE FUNCTION public.notify_admin_withdrawal_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT full_name INTO v_name FROM profiles WHERE user_id = NEW.user_id LIMIT 1;
    INSERT INTO admin_notifications (type, title, message, priority, related_entity_type, related_entity_id, related_user_id)
    VALUES ('withdrawal', 'New Withdrawal Request',
      'KES ' || NEW.amount || ' withdrawal requested by ' || COALESCE(v_name, 'a user') || '.',
      'high', 'withdrawal_request', NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_admin_withdrawal_request AFTER INSERT ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.notify_admin_withdrawal_request();

-- 4. Admin: runner withdrawal
CREATE OR REPLACE FUNCTION public.notify_admin_runner_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT full_name INTO v_name FROM profiles WHERE user_id = NEW.user_id LIMIT 1;
    INSERT INTO admin_notifications (type, title, message, priority, related_entity_type, related_entity_id, related_user_id)
    VALUES ('withdrawal', 'New Runner Payout Request',
      'KES ' || NEW.amount || ' payout requested by runner ' || COALESCE(v_name, 'unknown') || '.',
      'high', 'runner_withdrawal', NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_admin_runner_withdrawal AFTER INSERT ON public.runner_withdrawals FOR EACH ROW EXECUTE FUNCTION public.notify_admin_runner_withdrawal();

-- 5. Admin: dispute opened
CREATE OR REPLACE FUNCTION public.notify_admin_dispute_opened()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status = 'open' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'open') THEN
    SELECT full_name INTO v_name FROM profiles WHERE user_id = NEW.opened_by_user_id LIMIT 1;
    INSERT INTO admin_notifications (type, title, message, priority, related_entity_type, related_entity_id, related_user_id)
    VALUES ('dispute', 'New Dispute Opened',
      COALESCE(v_name, 'A user') || ' opened a ' || NEW.dispute_type || ' dispute.',
      'high', 'dispute', NEW.id, NEW.opened_by_user_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_admin_dispute_opened AFTER INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.notify_admin_dispute_opened();

-- 6. User: errand status change
CREATE OR REPLACE FUNCTION public.notify_user_errand_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_label := CASE NEW.status
      WHEN 'open' THEN 'is now open and visible to runners'
      WHEN 'assigned' THEN 'has been accepted by a runner'
      WHEN 'in_progress' THEN 'is now in progress'
      WHEN 'awaiting_confirmation' THEN 'is awaiting your confirmation'
      WHEN 'completed' THEN 'has been completed'
      WHEN 'cancelled' THEN 'has been cancelled'
      ELSE 'status updated to ' || NEW.status::text
    END;
    INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (NEW.customer_id, 'errand_update', 'Errand Update', 'Your errand "' || NEW.title || '" ' || v_label || '.', 'errand', NEW.id);
    IF NEW.runner_id IS NOT NULL AND NEW.runner_id IS DISTINCT FROM NEW.customer_id THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.runner_id, 'errand_update', 'Errand Update', 'Errand "' || NEW.title || '" ' || v_label || '.', 'errand', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_user_errand_status AFTER UPDATE ON public.errands FOR EACH ROW EXECUTE FUNCTION public.notify_user_errand_status();

-- 7. User: verification status change
CREATE OR REPLACE FUNCTION public.notify_user_verification_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'verified' THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, 'runner_approved', 'Application Approved! 🎉', 'Your runner application has been approved. You can now accept errands on Tumame!', 'runner_verification', NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, 'runner_rejected', 'Application Update', 'Your runner application was not approved. ' || COALESCE('Reason: ' || NEW.rejection_reason, 'Please review and resubmit.'), 'runner_verification', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_user_verification_status AFTER UPDATE ON public.runner_verifications FOR EACH ROW EXECUTE FUNCTION public.notify_user_verification_status();

-- 8. User: manual payment status change
CREATE OR REPLACE FUNCTION public.notify_user_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, 'payment_approved', 'Deposit Approved ✅', 'Your KES ' || NEW.amount || ' deposit has been approved and credited.', 'manual_payment', NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, 'payment_rejected', 'Deposit Rejected', 'Your KES ' || NEW.amount || ' deposit was not approved. ' || COALESCE(NEW.admin_note, ''), 'manual_payment', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_user_payment_status AFTER UPDATE ON public.manual_payments FOR EACH ROW EXECUTE FUNCTION public.notify_user_payment_status();

-- 9. User: withdrawal status change
CREATE OR REPLACE FUNCTION public.notify_user_withdrawal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('approved', 'paid') THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, 'withdrawal_update', 'Withdrawal ' || initcap(NEW.status), 'Your KES ' || NEW.amount || ' withdrawal has been ' || NEW.status || '.', 'withdrawal_request', NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, 'withdrawal_update', 'Withdrawal Rejected', 'Your KES ' || NEW.amount || ' withdrawal was rejected. ' || COALESCE(NEW.admin_note, ''), 'withdrawal_request', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_user_withdrawal_status AFTER UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.notify_user_withdrawal_status();

-- 10. Admin: new user signup
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, priority, related_entity_type, related_user_id)
  VALUES ('new_user', 'New User Registered', COALESCE(NEW.full_name, 'A user') || ' (' || COALESCE(NEW.email, '') || ') just signed up.', 'normal', 'profile', NEW.user_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_admin_new_user AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END $$;

-- Also add RLS policy so triggers (SECURITY DEFINER) can insert into user_notifications
-- The current INSERT policy requires user_id = auth.uid(), but triggers run as function owner
-- We need a service_role insert policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications" ON public.user_notifications FOR INSERT TO service_role WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_notifications' AND policyname = 'Service role can insert admin notifications'
  ) THEN
    CREATE POLICY "Service role can insert admin notifications" ON public.admin_notifications FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;
