CREATE OR REPLACE FUNCTION public.owns_business(_business_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_business_public(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id AND b.is_active = true AND b.verification_status = 'approved'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.owns_business(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_public(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Involved parties view reviews" ON public.reviews;
CREATE POLICY "Involved parties view reviews"
  ON public.reviews FOR SELECT
  USING (
    auth.uid() = customer_id
    OR public.owns_business(business_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::user_role)
  );

DROP POLICY IF EXISTS "Public can view reviews of listed businesses" ON public.reviews;
CREATE POLICY "Public can view reviews of listed businesses"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (public.is_business_public(business_id));