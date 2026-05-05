
-- Replace public read policy: only authenticated users can read full business row
DROP POLICY IF EXISTS "Public read active approved businesses" ON public.businesses;

-- Authenticated users can read full row of approved active businesses (includes contact info)
CREATE POLICY "Authenticated read approved businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (is_active = true AND verification_status = 'approved');

-- Anonymous users must use the businesses_public view (which omits phone/email/address)
GRANT SELECT ON public.businesses_public TO anon, authenticated;
