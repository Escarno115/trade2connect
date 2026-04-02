
-- Add service_areas column to businesses
ALTER TABLE public.businesses ADD COLUMN service_areas text[] DEFAULT '{}';

-- Recreate the businesses_public view to include service_areas
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT 
  id, name, city, country, description, logo_url, cover_url,
  office_address, operating_hours, is_active, verification_status,
  subscription_tier, service_areas
FROM public.businesses
WHERE is_active = true AND verification_status = 'approved';
