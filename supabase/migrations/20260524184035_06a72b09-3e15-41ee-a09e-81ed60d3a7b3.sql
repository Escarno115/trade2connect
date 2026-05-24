
DROP VIEW IF EXISTS public.business_response_stats;

CREATE VIEW public.business_response_stats AS
WITH paired AS (
  SELECT
    b.id AS business_id,
    m.created_at AS customer_msg_at,
    (
      SELECT MIN(m2.created_at)
      FROM public.messages m2
      WHERE m2.booking_id = m.booking_id
        AND m2.sender_id = b.owner_id
        AND m2.created_at > m.created_at
    ) AS owner_reply_at
  FROM public.messages m
  JOIN public.bookings bk ON bk.id = m.booking_id
  JOIN public.businesses b ON b.id = bk.business_id
  WHERE m.sender_id = bk.customer_id
)
SELECT
  business_id,
  AVG(EXTRACT(EPOCH FROM (owner_reply_at - customer_msg_at)))::bigint AS avg_response_seconds,
  COUNT(*) FILTER (WHERE owner_reply_at IS NOT NULL) AS replied_count
FROM paired
WHERE owner_reply_at IS NOT NULL
GROUP BY business_id;

GRANT SELECT ON public.business_response_stats TO anon, authenticated;
