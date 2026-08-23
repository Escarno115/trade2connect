-- Public listing view bypasses base-table RLS but exposes only safe columns
ALTER VIEW public.businesses_public SET (security_invoker = off);
GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- Base table: anon keeps safe-column access only; authenticated rows still limited
-- to own business (owner policy) or all rows for admins (admin policy).
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (id, name, city, country, description, logo_url, cover_url, office_address, operating_hours, is_active, verification_status, subscription_tier, service_areas)
  ON public.businesses TO anon;