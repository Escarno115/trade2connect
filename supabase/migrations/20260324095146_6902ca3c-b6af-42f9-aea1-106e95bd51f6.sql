
-- Add sort_order and is_featured columns to portfolio_images
ALTER TABLE public.portfolio_images ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.portfolio_images ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Allow owners to update their portfolio images (for reordering and featuring)
CREATE POLICY "Owners update portfolio images" ON public.portfolio_images
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = portfolio_images.business_id AND businesses.owner_id = auth.uid())
  );
