ALTER VIEW public.businesses_public SET (security_invoker = off);
ALTER VIEW public.reviews_public SET (security_invoker = off);

GRANT SELECT ON public.businesses_public TO anon, authenticated;
GRANT SELECT ON public.reviews_public TO anon, authenticated;