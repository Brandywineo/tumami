
-- Enum types
CREATE TYPE public.app_role AS ENUM ('customer', 'runner', 'admin');
CREATE TYPE public.errand_status AS ENUM ('pending_payment', 'paid', 'open', 'assigned', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'successful', 'failed', 'cancelled', 'refunded');
CREATE TYPE public.payout_status AS ENUM ('pending', 'released', 'failed');
CREATE TYPE public.verification_status AS ENUM ('not_submitted', 'under_review', 'verified', 'rejected');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  town TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Wallet accounts
CREATE TABLE public.wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallet_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallet_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_wallet_accounts_updated_at BEFORE UPDATE ON public.wallet_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Errands
CREATE TABLE public.errands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  runner_id UUID REFERENCES auth.users(id),
  service_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  pickup_location TEXT DEFAULT '',
  dropoff_location TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  runner_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  recipient_name TEXT DEFAULT '',
  recipient_phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status errand_status NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own errands" ON public.errands FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = runner_id);
CREATE POLICY "Customers can insert errands" ON public.errands FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Owners can update errands" ON public.errands FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = runner_id);
CREATE POLICY "Runners can view open errands" ON public.errands FOR SELECT USING (status IN ('paid', 'open'));
CREATE TRIGGER update_errands_updated_at BEFORE UPDATE ON public.errands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Errand status history
CREATE TABLE public.errand_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id UUID REFERENCES public.errands(id) ON DELETE CASCADE NOT NULL,
  status errand_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.errand_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view errand history" ON public.errand_status_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert history" ON public.errand_status_history FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  errand_id UUID REFERENCES public.errands(id),
  amount NUMERIC(12,2) NOT NULL,
  phone TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'errand', -- 'errand' or 'topup'
  status payment_status NOT NULL DEFAULT 'pending',
  mpesa_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallet_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL, -- 'topup', 'payment', 'payout', 'refund'
  reference TEXT,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payout records
CREATE TABLE public.payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  errand_id UUID REFERENCES public.errands(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Runners can view own payouts" ON public.payout_records FOR SELECT USING (auth.uid() = runner_id);
CREATE POLICY "Runners can insert own payouts" ON public.payout_records FOR INSERT WITH CHECK (auth.uid() = runner_id);
CREATE TRIGGER update_payout_records_updated_at BEFORE UPDATE ON public.payout_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Runner verifications
CREATE TABLE public.runner_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  national_id TEXT DEFAULT '',
  town TEXT DEFAULT '',
  transport TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  availability TEXT DEFAULT '',
  id_document_url TEXT,
  selfie_url TEXT,
  status verification_status NOT NULL DEFAULT 'not_submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runner_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own verification" ON public.runner_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own verification" ON public.runner_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own verification" ON public.runner_verifications FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_runner_verifications_updated_at BEFORE UPDATE ON public.runner_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shop check requests
CREATE TABLE public.shop_check_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  errand_id UUID REFERENCES public.errands(id),
  shop_name TEXT NOT NULL,
  platform TEXT DEFAULT '',
  shop_link TEXT DEFAULT '',
  item_checked TEXT DEFAULT '',
  seller_phone TEXT DEFAULT '',
  concern TEXT DEFAULT '',
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_check_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own shop checks" ON public.shop_check_requests FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can insert own shop checks" ON public.shop_check_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE TRIGGER update_shop_check_requests_updated_at BEFORE UPDATE ON public.shop_check_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved addresses
CREATE TABLE public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own addresses" ON public.saved_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.saved_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.saved_addresses FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile and wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.wallet_accounts (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
