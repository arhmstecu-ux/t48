ALTER TABLE public.paid_livestream_settings ADD COLUMN IF NOT EXISTS rtmp_url text NOT NULL DEFAULT '';
DROP FUNCTION IF EXISTS public.get_paid_livestream_public();
CREATE OR REPLACE FUNCTION public.get_paid_livestream_public()
RETURNS TABLE(
  id uuid, active_server text, youtube_url text, rtmp_url text,
  title text, description text, logo_url text, background_url text,
  start_time timestamp with time zone, is_live boolean, updated_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id, active_server, youtube_url, rtmp_url, title, description, logo_url,
         background_url, start_time, is_live, updated_at
  FROM public.paid_livestream_settings LIMIT 1
$function$;