-- 1) Restore full-table SELECT for authenticated
REVOKE SELECT ON public.businesses FROM authenticated;
GRANT SELECT ON public.businesses TO authenticated;

-- 2) Keep anon restricted to public-safe columns only
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (id, name, city, country, description, logo_url, cover_url, office_address, operating_hours, is_active, verification_status, subscription_tier, service_areas)
  ON public.businesses TO anon;

-- 3) Public row policy applies to anon only
DROP POLICY IF EXISTS "Public can view approved active businesses" ON public.businesses;
CREATE POLICY "Public can view approved active businesses"
  ON public.businesses FOR SELECT TO anon
  USING (is_active = true AND verification_status = 'approved');