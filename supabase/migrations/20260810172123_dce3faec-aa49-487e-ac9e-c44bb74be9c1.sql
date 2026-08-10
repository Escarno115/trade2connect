CREATE TABLE public.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_rate_limits_window_start ON public.rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max_requests integer DEFAULT 10,
  _window_seconds integer DEFAULT 60
)
RETURNS TABLE(allowed boolean, current_count integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz;
  _count integer;
BEGIN
  IF _key IS NULL OR length(_key) = 0 OR length(_key) > 200 THEN
    RAISE EXCEPTION 'Invalid rate limit key';
  END IF;
  IF _max_requests < 1 OR _window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  -- Fixed-window bucket
  _window_start := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.rate_limits (key, window_start, request_count)
  VALUES (_key, _window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1,
                updated_at = now()
  RETURNING request_count INTO _count;

  RETURN QUERY SELECT
    _count <= _max_requests,
    _count,
    GREATEST(0, ceil(extract(epoch from (_window_start + make_interval(secs => _window_seconds) - now())))::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'cleanup-rate-limits-hourly',
  '0 * * * *',
  $$SELECT public.cleanup_rate_limits();$$
);
