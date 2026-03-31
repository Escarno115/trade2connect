DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  city,
  country,
  description,
  logo_url,
  cover_url,
  office_address,
  operating_hours,
  is_active,
  verification_status,
  subscription_tier
FROM public.businesses
WHERE is_active = true;