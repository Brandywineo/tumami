
-- Trigger to send push notification when user_notifications are inserted
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
BEGIN
  -- Build URL based on notification type
  v_url := CASE
    WHEN NEW.related_entity_type = 'errand' THEN '/customer/errand/' || NEW.related_entity_id
    WHEN NEW.related_entity_type = 'manual_payment' THEN '/customer/wallet'
    WHEN NEW.related_entity_type = 'withdrawal_request' THEN '/runner/wallet'
    WHEN NEW.related_entity_type = 'runner_verification' THEN '/runner'
    ELSE '/'
  END;

  -- Call the edge function via pg_net if available, otherwise just insert
  -- We use a simple HTTP call to the edge function
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'url', v_url,
      'tag', NEW.type
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If pg_net is not available or call fails, just continue silently
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_user_notification_push
  AFTER INSERT ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();
