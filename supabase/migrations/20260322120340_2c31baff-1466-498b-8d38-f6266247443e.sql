
-- Fix 1: Prevent admin role escalation via signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE
    WHEN (NEW.raw_user_meta_data->>'role') IN ('customer','business')
    THEN (NEW.raw_user_meta_data->>'role')::user_role
    ELSE 'customer'
  END);
  RETURN NEW;
END;
$$;

-- Fix 2: Tighten reviews INSERT policy to verify booking ownership
DROP POLICY IF EXISTS "Customers create own reviews" ON public.reviews;
CREATE POLICY "Customers create own reviews" ON public.reviews
FOR INSERT WITH CHECK (
  auth.uid() = customer_id
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = reviews.booking_id
      AND customer_id = auth.uid()
      AND business_id = reviews.business_id
      AND status = 'completed'
  )
);

-- Fix 3: Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;
CREATE POLICY "Authenticated profiles viewable" ON public.profiles
FOR SELECT TO authenticated
USING (true);
