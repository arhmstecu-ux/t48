-- 1) Remove paid_livestream_settings from Realtime publication
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='paid_livestream_settings';
  IF FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.paid_livestream_settings';
  END IF;
END $$;

-- 2) Create pulse table that only carries a timestamp (no sensitive fields)
CREATE TABLE IF NOT EXISTS public.paid_livestream_pulse (
  id int PRIMARY KEY DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_pulse CHECK (id = 1)
);

GRANT SELECT ON public.paid_livestream_pulse TO anon, authenticated;
GRANT ALL ON public.paid_livestream_pulse TO service_role;

ALTER TABLE public.paid_livestream_pulse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pulse" ON public.paid_livestream_pulse;
CREATE POLICY "Anyone can read pulse" ON public.paid_livestream_pulse
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.paid_livestream_pulse (id, updated_at) VALUES (1, now())
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.paid_livestream_pulse REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='paid_livestream_pulse';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_pulse';
  END IF;
END $$;

-- 3) Trigger to bump pulse on settings change
CREATE OR REPLACE FUNCTION public.bump_paid_livestream_pulse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.paid_livestream_pulse SET updated_at = now() WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.paid_livestream_pulse (id, updated_at) VALUES (1, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_paid_livestream_pulse ON public.paid_livestream_settings;
CREATE TRIGGER trg_bump_paid_livestream_pulse
  AFTER INSERT OR UPDATE ON public.paid_livestream_settings
  FOR EACH ROW EXECUTE FUNCTION public.bump_paid_livestream_pulse();

-- 4) Drop self-insert policy on notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 5) Drop broad public SELECT policies on storage.objects (public URLs continue to work via public proxy)
DROP POLICY IF EXISTS "Public read paid-live" ON storage.objects;
DROP POLICY IF EXISTS "Public read songs bucket" ON storage.objects;