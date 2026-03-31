
-- 1. Fix storage policies for portfolio-images (ensure correct column reference)
DROP POLICY IF EXISTS "Business owners upload portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Business owners delete portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Business owners update portfolio" ON storage.objects;

CREATE POLICY "Business owners upload portfolio"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners delete portfolio"
ON storage.objects FOR DELETE TO public
USING (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners update portfolio"
ON storage.objects FOR UPDATE TO public
USING (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
  )
);

-- 2. Prevent business owners from escalating verification_status and subscription_tier
CREATE OR REPLACE FUNCTION public.protect_business_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the updater is NOT an admin, prevent changes to sensitive fields
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.verification_status := OLD.verification_status;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.phone_verified := OLD.phone_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_business_sensitive ON public.businesses;
CREATE TRIGGER trg_protect_business_sensitive
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.protect_business_sensitive_fields();

-- 3. Update businesses_public view to include contact info and subscription_tier (needed for UI badges)
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public
WITH (security_invoker = true)
AS
SELECT
  id, name, city, country, description, logo_url, cover_url,
  operating_hours, office_address, is_active, verification_status,
  phone, email, subscription_tier
FROM public.businesses
WHERE verification_status = 'approved' AND is_active = true;

-- 4. Remove the broad "Verified businesses public" policy that exposes all columns
DROP POLICY IF EXISTS "Verified businesses public" ON public.businesses;

-- 5. Create reviews_public view without customer_id
CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = true)
AS
SELECT
  id, booking_id, business_id, rating, comment, created_at
FROM public.reviews;
