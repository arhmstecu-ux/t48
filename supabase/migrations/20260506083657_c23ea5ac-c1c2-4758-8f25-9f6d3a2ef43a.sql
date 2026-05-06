CREATE TABLE IF NOT EXISTS public.paid_livestream_lineup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  generation INTEGER NOT NULL,
  photo_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.paid_livestream_lineup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineup public read" ON public.paid_livestream_lineup FOR SELECT USING (true);
CREATE POLICY "lineup admin insert" ON public.paid_livestream_lineup FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "lineup admin update" ON public.paid_livestream_lineup FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "lineup admin delete" ON public.paid_livestream_lineup FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_lineup;
ALTER TABLE public.paid_livestream_lineup REPLICA IDENTITY FULL;