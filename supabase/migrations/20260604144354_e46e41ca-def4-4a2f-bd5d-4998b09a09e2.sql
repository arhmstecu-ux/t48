ALTER TABLE public.paid_livestream_settings
  ADD COLUMN IF NOT EXISTS public_access boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_paid_livestream_public();

CREATE OR REPLACE FUNCTION public.get_paid_livestream_public()
 RETURNS TABLE(id uuid, active_server text, youtube_url text, rtmp_url text, title text, description text, logo_url text, background_url text, start_time timestamp with time zone, is_live boolean, public_access boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, active_server, youtube_url, rtmp_url, title, description, logo_url,
         background_url, start_time, is_live, public_access, updated_at
  FROM public.paid_livestream_settings LIMIT 1
$function$;

ALTER TABLE public.paid_livestream_settings REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='paid_livestream_settings';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_settings';
  END IF;
END $$;