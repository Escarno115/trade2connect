CREATE POLICY "Owners update own invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
  )
);