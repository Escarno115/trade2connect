
-- 1) Remove broad authenticated SELECT on businesses (sensitive cols exposed). Public reads go through businesses_public view.
DROP POLICY IF EXISTS "Authenticated read approved businesses" ON public.businesses;

-- 2) Ensure businesses_public view is readable by anon + authenticated
GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- 3) Lock down SECURITY DEFINER functions: revoke EXECUTE from anon (and authenticated where not needed)
REVOKE EXECUTE ON FUNCTION public.get_booking_customer_summaries(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_subscription_invoices() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_booking_commission() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_commission_on_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_business_sensitive_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;

-- 4) Add admin-only DELETE policy for reviews
DROP POLICY IF EXISTS "Admins delete reviews" ON public.reviews;
CREATE POLICY "Admins delete reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 5) Defense-in-depth: enforce length limits on free-text user input to mitigate abuse / payload-based attacks
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_full_name_length,
  ADD CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) <= 120);

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_content_length,
  ADD CONSTRAINT messages_content_length CHECK (char_length(content) BETWEEN 1 AND 4000);

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_comment_length,
  ADD CONSTRAINT reviews_comment_length CHECK (char_length(coalesce(comment,'')) <= 4000);

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_range,
  ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_notes_length,
  ADD CONSTRAINT bookings_notes_length CHECK (char_length(coalesce(notes,'')) <= 4000);

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_name_length,
  ADD CONSTRAINT businesses_name_length CHECK (char_length(name) BETWEEN 1 AND 200);

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_description_length,
  ADD CONSTRAINT businesses_description_length CHECK (char_length(coalesce(description,'')) <= 5000);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_title_length,
  ADD CONSTRAINT services_title_length CHECK (char_length(title) BETWEEN 1 AND 200);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_description_length,
  ADD CONSTRAINT services_description_length CHECK (char_length(coalesce(description,'')) <= 5000);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_base_price_nonneg,
  ADD CONSTRAINT services_base_price_nonneg CHECK (base_price >= 0);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_total_price_nonneg,
  ADD CONSTRAINT bookings_total_price_nonneg CHECK (coalesce(total_price,0) >= 0);
