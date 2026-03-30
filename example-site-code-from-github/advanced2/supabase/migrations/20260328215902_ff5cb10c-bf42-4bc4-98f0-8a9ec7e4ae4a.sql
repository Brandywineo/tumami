
-- Tighten INSERT policies: notifications are only inserted by triggers (SECURITY DEFINER), not by regular users
DROP POLICY "Anyone can insert admin notifications" ON public.admin_notifications;
DROP POLICY "Anyone can insert user notifications" ON public.user_notifications;

-- Only allow admin to insert admin notifications directly
CREATE POLICY "Admin can insert admin notifications"
  ON public.admin_notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can only insert notifications for themselves
CREATE POLICY "Users can insert own notifications"
  ON public.user_notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
