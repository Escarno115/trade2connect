CREATE POLICY "Public read active approved businesses"
  ON public.businesses FOR SELECT
  TO public
  USING (is_active = true AND verification_status = 'approved'::verification_status);