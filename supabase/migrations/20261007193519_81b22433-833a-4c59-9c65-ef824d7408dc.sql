CREATE TABLE public.business_loyalty (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  discount_percent integer NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 1 AND 50),
  min_bookings integer NOT NULL DEFAULT 3 CHECK (min_bookings BETWEEN 2 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_loyalty TO anon;
GRANT SELECT, INSERT, UPDATE ON public.business_loyalty TO authenticated;
GRANT ALL ON public.business_loyalty TO service_role;
ALTER TABLE public.business_loyalty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view loyalty offers" ON public.business_loyalty FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners create loyalty offer" ON public.business_loyalty FOR INSERT TO authenticated
  WITH CHECK (public.owns_business(business_id, auth.uid()));
CREATE POLICY "Owners update loyalty offer" ON public.business_loyalty FOR UPDATE TO authenticated
  USING (public.owns_business(business_id, auth.uid())) WITH CHECK (public.owns_business(business_id, auth.uid()));
CREATE TRIGGER update_business_loyalty_ts BEFORE UPDATE ON public.business_loyalty FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.business_repeat_stats (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  unique_customers integer NOT NULL DEFAULT 0,
  repeat_customers integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_repeat_stats TO anon, authenticated;
GRANT ALL ON public.business_repeat_stats TO service_role;
ALTER TABLE public.business_repeat_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view repeat stats" ON public.business_repeat_stats FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.bookings ADD COLUMN discount_percent integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_business_repeat_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.business_repeat_stats (business_id, unique_customers, repeat_customers, updated_at)
    SELECT NEW.business_id, count(*), count(*) FILTER (WHERE n > 1), now()
    FROM (SELECT customer_id, count(*) n FROM public.bookings
          WHERE business_id = NEW.business_id AND status = 'completed' GROUP BY customer_id) s
    ON CONFLICT (business_id) DO UPDATE
      SET unique_customers = EXCLUDED.unique_customers,
          repeat_customers = EXCLUDED.repeat_customers,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_business_repeat_stats() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_refresh_repeat_stats AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.refresh_business_repeat_stats();

CREATE OR REPLACE FUNCTION public.set_booking_price_from_service()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _price numeric;
  _loyalty record;
  _prior integer;
BEGIN
  SELECT base_price INTO _price FROM public.services WHERE id = NEW.service_id AND is_active = true;
  IF _price IS NULL THEN
    RAISE EXCEPTION 'Service % is not available for booking', NEW.service_id;
  END IF;

  NEW.discount_percent := 0;
  SELECT enabled, discount_percent, min_bookings INTO _loyalty
    FROM public.business_loyalty WHERE business_id = NEW.business_id;
  IF _loyalty.enabled THEN
    SELECT count(*) INTO _prior FROM public.bookings
      WHERE business_id = NEW.business_id AND customer_id = NEW.customer_id AND status = 'completed';
    IF _prior + 1 >= _loyalty.min_bookings THEN
      NEW.discount_percent := _loyalty.discount_percent;
    END IF;
  END IF;

  NEW.total_price := ROUND(_price * (100 - NEW.discount_percent) / 100, 2);
  RETURN NEW;
END;
$$;

INSERT INTO public.business_repeat_stats (business_id, unique_customers, repeat_customers)
SELECT business_id, count(*), count(*) FILTER (WHERE n > 1)
FROM (SELECT business_id, customer_id, count(*) n FROM public.bookings WHERE status = 'completed' GROUP BY 1,2) s
GROUP BY business_id
ON CONFLICT (business_id) DO NOTHING;