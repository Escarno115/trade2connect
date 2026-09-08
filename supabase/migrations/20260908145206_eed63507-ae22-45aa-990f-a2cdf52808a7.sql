-- 1. Remove anon direct access to the businesses base table
DROP POLICY IF EXISTS "Public can view approved active businesses" ON public.businesses;
REVOKE ALL ON public.businesses FROM anon;

-- 2. Safe listing source as a SECURITY DEFINER function (no definer views)
CREATE OR REPLACE FUNCTION public.list_public_businesses()
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  country text,
  description text,
  logo_url text,
  cover_url text,
  office_address text,
  operating_hours jsonb,
  is_active boolean,
  verification_status public.verification_status,
  subscription_tier public.subscription_tier,
  service_areas text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.city, b.country, b.description, b.logo_url, b.cover_url,
         b.office_address, b.operating_hours, b.is_active, b.verification_status,
         b.subscription_tier, b.service_areas
  FROM public.businesses b
  WHERE b.is_active = true
    AND b.verification_status = 'approved';
$$;

REVOKE ALL ON FUNCTION public.list_public_businesses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_businesses() TO anon, authenticated, service_role;

-- 3. Rebuild public views as invoker views
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public
WITH (security_invoker = on) AS
SELECT * FROM public.list_public_businesses();

ALTER VIEW public.reviews_public SET (security_invoker = on);

GRANT SELECT ON public.businesses_public TO anon, authenticated;
GRANT SELECT ON public.reviews_public TO anon, authenticated;