
-- Add commission tracking columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN commission_rate numeric DEFAULT 0,
  ADD COLUMN commission_amount numeric DEFAULT 0;

-- Create trigger function to auto-calculate commission on completion
CREATE OR REPLACE FUNCTION public.calculate_booking_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tier subscription_tier;
  _rate numeric;
BEGIN
  -- Only calculate when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get the business subscription tier
    SELECT subscription_tier INTO _tier
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Map tier to commission rate
    _rate := CASE _tier
      WHEN 'free' THEN 14
      WHEN 'basic' THEN 7
      WHEN 'pro' THEN 1
      ELSE 14
    END;

    NEW.commission_rate := _rate;
    NEW.commission_amount := ROUND((COALESCE(NEW.total_price, 0) * _rate / 100), 2);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_commission
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_booking_commission();
