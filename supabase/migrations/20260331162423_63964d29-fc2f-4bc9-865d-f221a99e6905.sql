
-- 1. Fix broken storage policies for portfolio-images bucket
DROP POLICY IF EXISTS "Business owners upload portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Business owners delete portfolio" ON storage.objects;

CREATE POLICY "Business owners upload portfolio"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners delete portfolio"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners update portfolio"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
  )
);

-- 2. Remove dangerous invoice owner UPDATE policy
DROP POLICY IF EXISTS "Owners update own invoices" ON public.invoices;

-- 3. Fix message update policy - add sender_id check
DROP POLICY IF EXISTS "Customers update messages" ON public.messages;
CREATE POLICY "Customers update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = messages.booking_id
      AND bookings.customer_id = auth.uid()
  )
);

-- 4. Fix booking commission bypass - add trigger to override commission fields
CREATE OR REPLACE FUNCTION public.reset_commission_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always reset commission fields on insert - they are computed on completion
  NEW.commission_rate := 0;
  NEW.commission_amount := 0;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reset_commission_on_insert
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.reset_commission_on_insert();

-- 5. Create a public-safe view for businesses
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT
  id, name, city, country, description, logo_url, cover_url,
  operating_hours, office_address, is_active, verification_status
FROM public.businesses
WHERE verification_status = 'approved' AND is_active = true;
