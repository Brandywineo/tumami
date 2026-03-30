
-- Fix overly permissive INSERT policy on platform_earnings
DROP POLICY IF EXISTS "System can insert platform earnings" ON public.platform_earnings;
CREATE POLICY "Admins can insert platform earnings" ON public.platform_earnings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
