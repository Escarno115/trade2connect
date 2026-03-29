
-- Drop the overly broad profile SELECT policy
DROP POLICY IF EXISTS "Authenticated profiles viewable" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Business owners can view profiles of customers who booked with them
CREATE POLICY "Business owners view booking customer profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN businesses biz ON biz.id = b.business_id
      WHERE b.customer_id = profiles.id
        AND biz.owner_id = auth.uid()
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));
