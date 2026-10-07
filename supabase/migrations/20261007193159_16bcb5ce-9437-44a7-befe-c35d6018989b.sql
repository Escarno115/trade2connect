CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.is_booking_participant(_booking_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings bk JOIN public.businesses b ON b.id = bk.business_id
    WHERE bk.id = _booking_id AND (bk.customer_id = _user_id OR b.owner_id = _user_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION private.is_booking_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_booking_participant(uuid, uuid) TO authenticated;

DROP POLICY "Chat videos upload by participants" ON storage.objects;
DROP POLICY "Chat videos read by participants" ON storage.objects;
CREATE POLICY "Chat videos upload by participants" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-videos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND private.is_booking_participant(((storage.foldername(name))[1])::uuid, auth.uid())
    AND lower(storage.extension(name)) IN ('mp4','mov','webm')
  );
CREATE POLICY "Chat videos read by participants" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-videos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND (private.is_booking_participant(((storage.foldername(name))[1])::uuid, auth.uid())
         OR public.has_role(auth.uid(), 'admin'))
  );
DROP FUNCTION public.is_booking_participant(uuid, uuid);