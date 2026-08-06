GRANT EXECUTE ON FUNCTION public.owns_business(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_public(uuid) TO anon, authenticated;

-- services
DROP POLICY IF EXISTS "Business owners manage services" ON public.services;
CREATE POLICY "Business owners manage services" ON public.services
  FOR ALL USING (public.owns_business(business_id, auth.uid()))
  WITH CHECK (public.owns_business(business_id, auth.uid()));

-- bookings
DROP POLICY IF EXISTS "Business owners view bookings" ON public.bookings;
CREATE POLICY "Business owners view bookings" ON public.bookings
  FOR SELECT USING (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Business owners update bookings" ON public.bookings;
CREATE POLICY "Business owners update bookings" ON public.bookings
  FOR UPDATE USING (public.owns_business(business_id, auth.uid()));

-- messages
DROP POLICY IF EXISTS "Business owners view booking messages" ON public.messages;
CREATE POLICY "Business owners view booking messages" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.bookings bk
    WHERE bk.id = messages.booking_id AND public.owns_business(bk.business_id, auth.uid())));
DROP POLICY IF EXISTS "Business owners update messages" ON public.messages;
CREATE POLICY "Business owners update messages" ON public.messages
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.bookings bk
    WHERE bk.id = messages.booking_id AND public.owns_business(bk.business_id, auth.uid())));
DROP POLICY IF EXISTS "Business owners insert messages" ON public.messages;
CREATE POLICY "Business owners insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.bookings bk
    WHERE bk.id = messages.booking_id AND public.owns_business(bk.business_id, auth.uid())));

-- review_responses
DROP POLICY IF EXISTS "Business owners insert responses" ON public.review_responses;
CREATE POLICY "Business owners insert responses" ON public.review_responses
  FOR INSERT WITH CHECK (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Business owners update responses" ON public.review_responses;
CREATE POLICY "Business owners update responses" ON public.review_responses
  FOR UPDATE USING (public.owns_business(business_id, auth.uid()));

-- subscription_requests
DROP POLICY IF EXISTS "Owners view own requests" ON public.subscription_requests;
CREATE POLICY "Owners view own requests" ON public.subscription_requests
  FOR SELECT USING (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Owners create requests" ON public.subscription_requests;
CREATE POLICY "Owners create requests" ON public.subscription_requests
  FOR INSERT WITH CHECK (public.owns_business(business_id, auth.uid()));

-- invoices
DROP POLICY IF EXISTS "Owners view own invoices" ON public.invoices;
CREATE POLICY "Owners view own invoices" ON public.invoices
  FOR SELECT USING (public.owns_business(business_id, auth.uid()));

-- verification_documents
DROP POLICY IF EXISTS "Owners view own docs" ON public.verification_documents;
CREATE POLICY "Owners view own docs" ON public.verification_documents
  FOR SELECT USING (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Owners upload docs" ON public.verification_documents;
CREATE POLICY "Owners upload docs" ON public.verification_documents
  FOR INSERT WITH CHECK (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Owners delete verification doc rows" ON public.verification_documents;
CREATE POLICY "Owners delete verification doc rows" ON public.verification_documents
  FOR DELETE USING (public.owns_business(business_id, auth.uid()));

-- portfolio_images
DROP POLICY IF EXISTS "Owners insert portfolio images" ON public.portfolio_images;
CREATE POLICY "Owners insert portfolio images" ON public.portfolio_images
  FOR INSERT WITH CHECK (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Owners update portfolio images" ON public.portfolio_images;
CREATE POLICY "Owners update portfolio images" ON public.portfolio_images
  FOR UPDATE USING (public.owns_business(business_id, auth.uid()));
DROP POLICY IF EXISTS "Owners delete portfolio images" ON public.portfolio_images;
CREATE POLICY "Owners delete portfolio images" ON public.portfolio_images
  FOR DELETE USING (public.owns_business(business_id, auth.uid()));

-- storage objects (portfolio bucket)
DROP POLICY IF EXISTS "Business owners upload portfolio" ON storage.objects;
CREATE POLICY "Business owners upload portfolio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'portfolio-images'
    AND public.owns_business(((storage.foldername(name))[1])::uuid, auth.uid()));
DROP POLICY IF EXISTS "Business owners update portfolio" ON storage.objects;
CREATE POLICY "Business owners update portfolio" ON storage.objects
  FOR UPDATE USING (bucket_id = 'portfolio-images'
    AND public.owns_business(((storage.foldername(name))[1])::uuid, auth.uid()));
DROP POLICY IF EXISTS "Business owners delete portfolio" ON storage.objects;
CREATE POLICY "Business owners delete portfolio" ON storage.objects
  FOR DELETE USING (bucket_id = 'portfolio-images'
    AND public.owns_business(((storage.foldername(name))[1])::uuid, auth.uid()));