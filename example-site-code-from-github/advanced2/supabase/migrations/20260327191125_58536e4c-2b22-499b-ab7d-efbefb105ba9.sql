
-- Manual payment submissions table
CREATE TABLE public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  mpesa_code text NOT NULL,
  till_number text NOT NULL DEFAULT '3405451',
  business_name text NOT NULL DEFAULT 'TUMAMI NETWORKS',
  purpose text NOT NULL DEFAULT 'wallet_topup',
  errand_id uuid,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own manual payments"
  ON public.manual_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own manual payments"
  ON public.manual_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all manual payments"
  ON public.manual_payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update manual payments"
  ON public.manual_payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Unique constraint on mpesa_code to prevent duplicates
CREATE UNIQUE INDEX idx_manual_payments_mpesa_code ON public.manual_payments (mpesa_code);
