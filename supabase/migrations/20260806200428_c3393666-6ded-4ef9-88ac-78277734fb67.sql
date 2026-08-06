-- 1. Column-level SELECT grants on public.businesses
REVOKE SELECT ON public.businesses FROM anon, authenticated;

GRANT SELECT (
  id, name, city, country, description, logo_url, cover_url,
  office_address, operating_hours, is_active, verification_status,
  subscription_tier, service_areas
) ON public.businesses TO anon, authenticated;

-- 2. Row policy for public listing visibility
DROP POLICY IF EXISTS "Public can view approved active businesses" ON public.businesses;
CREATE POLICY "Public can view approved active businesses"
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND verification_status = 'approved');

-- 3. Views respect RLS of the querying user
ALTER VIEW public.businesses_public SET (security_invoker = on);
ALTER VIEW public.reviews_public SET (security_invoker = on);