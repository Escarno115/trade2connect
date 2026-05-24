
DROP VIEW IF EXISTS public.business_response_stats;

CREATE TABLE public.business_response_stats (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  total_response_seconds bigint NOT NULL DEFAULT 0,
  replied_count integer NOT NULL DEFAULT 0,
  avg_response_seconds integer GENERATED ALWAYS AS (
    CASE WHEN replied_count > 0 THEN (total_response_seconds / replied_count)::int ELSE NULL END
  ) STORED,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_response_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view response stats"
ON public.business_response_stats FOR SELECT
USING (true);

-- Backfill from existing messages
INSERT INTO public.business_response_stats (business_id, total_response_seconds, replied_count)
SELECT
  bk.business_id,
  COALESCE(SUM(EXTRACT(EPOCH FROM (reply.created_at - cust.created_at)))::bigint, 0),
  COUNT(*)::int
FROM public.messages cust
JOIN public.bookings bk ON bk.id = cust.booking_id
JOIN public.businesses b ON b.id = bk.business_id
JOIN LATERAL (
  SELECT MIN(m2.created_at) AS created_at
  FROM public.messages m2
  WHERE m2.booking_id = cust.booking_id
    AND m2.sender_id = b.owner_id
    AND m2.created_at > cust.created_at
) reply ON reply.created_at IS NOT NULL
WHERE cust.sender_id = bk.customer_id
GROUP BY bk.business_id
ON CONFLICT (business_id) DO UPDATE
SET total_response_seconds = EXCLUDED.total_response_seconds,
    replied_count = EXCLUDED.replied_count,
    updated_at = now();

-- Trigger: when a business owner sends a message, find the most recent prior customer
-- message in the same booking that hasn't been counted yet, and record the response gap.
CREATE OR REPLACE FUNCTION public.track_business_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _owner_id uuid;
  _customer_id uuid;
  _last_customer_msg timestamptz;
  _last_owner_msg_before timestamptz;
  _gap_seconds bigint;
BEGIN
  SELECT bk.business_id, b.owner_id, bk.customer_id
    INTO _business_id, _owner_id, _customer_id
  FROM public.bookings bk
  JOIN public.businesses b ON b.id = bk.business_id
  WHERE bk.id = NEW.booking_id;

  -- Only count when the sender is the business owner
  IF NEW.sender_id IS DISTINCT FROM _owner_id THEN
    RETURN NEW;
  END IF;

  -- Find the most recent customer message before this reply
  SELECT MAX(created_at) INTO _last_customer_msg
  FROM public.messages
  WHERE booking_id = NEW.booking_id
    AND sender_id = _customer_id
    AND created_at < NEW.created_at;

  IF _last_customer_msg IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid double-counting: only record if no prior owner reply already followed this customer msg
  SELECT MAX(created_at) INTO _last_owner_msg_before
  FROM public.messages
  WHERE booking_id = NEW.booking_id
    AND sender_id = _owner_id
    AND created_at > _last_customer_msg
    AND created_at < NEW.created_at;

  IF _last_owner_msg_before IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _gap_seconds := EXTRACT(EPOCH FROM (NEW.created_at - _last_customer_msg))::bigint;

  INSERT INTO public.business_response_stats (business_id, total_response_seconds, replied_count)
  VALUES (_business_id, _gap_seconds, 1)
  ON CONFLICT (business_id) DO UPDATE
  SET total_response_seconds = public.business_response_stats.total_response_seconds + _gap_seconds,
      replied_count = public.business_response_stats.replied_count + 1,
      updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.track_business_response() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_track_business_response
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.track_business_response();
