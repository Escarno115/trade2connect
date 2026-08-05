CREATE OR REPLACE FUNCTION public.set_booking_price_from_service()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT base_price INTO NEW.total_price FROM public.services WHERE id = NEW.service_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_booking_price_from_service() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_set_booking_price ON public.bookings;
CREATE TRIGGER trg_set_booking_price
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_price_from_service();