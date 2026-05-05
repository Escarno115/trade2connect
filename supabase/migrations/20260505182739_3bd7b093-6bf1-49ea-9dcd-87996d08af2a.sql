
-- 1. Protect is_active on businesses from owner self-modification
CREATE OR REPLACE FUNCTION public.protect_business_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.verification_status := OLD.verification_status;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.phone_verified := OLD.phone_verified;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_protect_business_sensitive_fields ON public.businesses;
CREATE TRIGGER trg_protect_business_sensitive_fields
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.protect_business_sensitive_fields();

-- 2. Add admin-only INSERT/DELETE policies on user_roles to harden against future SECURITY DEFINER mistakes
CREATE POLICY "Admins insert user roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. Allow owners to delete their own verification documents from storage
CREATE POLICY "Owners delete verification docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Also allow deletion of the verification_documents row by owners
CREATE POLICY "Owners delete verification doc rows" ON public.verification_documents
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = verification_documents.business_id
      AND businesses.owner_id = auth.uid()
  ));

-- 4. Prevent listing of portfolio-images bucket while keeping direct public URL access (public bucket CDN URLs work without policy)
DROP POLICY IF EXISTS "Public portfolio read" ON storage.objects;

-- 5. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.generate_subscription_invoices() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_business_sensitive_fields() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.calculate_booking_commission() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reset_commission_on_insert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;

-- 6. Limit business-owner access to customer profiles to non-sensitive fields via a view
-- Drop the broad cross-table policy and replace with a safer SECURITY DEFINER function.
DROP POLICY IF EXISTS "Business owners view booking customer profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_booking_customer_summaries(_business_id uuid)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM public.profiles p
  JOIN public.bookings b ON b.customer_id = p.id
  WHERE b.business_id = _business_id
    AND EXISTS (
      SELECT 1 FROM public.businesses biz
      WHERE biz.id = _business_id AND biz.owner_id = auth.uid()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_booking_customer_summaries(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_booking_customer_summaries(uuid) TO authenticated;
