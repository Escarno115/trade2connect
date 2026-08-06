CREATE OR REPLACE FUNCTION public.set_booking_price_from_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price numeric;
BEGIN
  SELECT base_price INTO _price
  FROM public.services
  WHERE id = NEW.service_id AND is_active = true;

  IF _price IS NULL THEN
    RAISE EXCEPTION 'Service % is not available for booking', NEW.service_id;
  END IF;

  NEW.total_price := _price;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_price ON public.bookings;
CREATE TRIGGER trg_set_booking_price
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_price_from_service();

REVOKE EXECUTE ON FUNCTION public.set_booking_price_from_service() FROM anon, authenticated, public;