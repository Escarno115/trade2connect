-- Enums
CREATE TYPE public.user_role AS ENUM ('customer', 'business', 'admin');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'pro');
CREATE TYPE public.service_category AS ENUM ('plumbing', 'electrical', 'carpentry', 'building', 'painting', 'roofing', 'landscaping', 'cleaning', 'hvac', 'other');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  city TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  phone TEXT,
  email TEXT,
  city TEXT NOT NULL DEFAULT '',
  address TEXT,
  logo_url TEXT,
  cover_url TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_rejected_reason TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified businesses public" ON public.businesses FOR SELECT USING (verification_status = 'approved' AND is_active = true);
CREATE POLICY "Owners view own business" ON public.businesses FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners update own business" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert business" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins view all businesses" ON public.businesses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update businesses" ON public.businesses FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category service_category NOT NULL,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active services public" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Business owners manage services" ON public.services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = services.business_id AND owner_id = auth.uid())
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  notes TEXT,
  total_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Business owners view bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = bookings.business_id AND owner_id = auth.uid())
);
CREATE POLICY "Business owners update bookings" ON public.bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = bookings.business_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins manage bookings" ON public.bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Verification documents table
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own docs" ON public.verification_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = verification_documents.business_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners upload docs" ON public.verification_documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = verification_documents.business_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins view all docs" ON public.verification_documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false);
CREATE POLICY "Owners upload verification docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners view own verification docs" ON storage.objects FOR SELECT USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all verification docs" ON storage.objects FOR SELECT USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_ts BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_businesses_ts BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_services_ts BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_bookings_ts BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_businesses_city ON public.businesses(city);
CREATE INDEX idx_businesses_verification ON public.businesses(verification_status);
CREATE INDEX idx_businesses_tier ON public.businesses(subscription_tier);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_services_business ON public.services(business_id);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_business ON public.bookings(business_id);