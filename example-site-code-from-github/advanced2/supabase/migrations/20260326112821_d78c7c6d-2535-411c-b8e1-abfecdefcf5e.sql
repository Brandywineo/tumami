
-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can view their own
CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin policies on existing tables
CREATE POLICY "Admins can view all runner verifications" ON public.runner_verifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update runner verifications" ON public.runner_verifications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on withdrawal_requests
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
