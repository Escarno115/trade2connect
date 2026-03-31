
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public
WITH (security_invoker = true)
AS
SELECT
  id, name, city, country, description, logo_url, cover_url,
  operating_hours, office_address, is_active, verification_status
FROM public.businesses
WHERE verification_status = 'approved' AND is_active = true;
