
-- Songs table for JKT48 playlist
CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'JKT48',
  video_url text NOT NULL,
  thumbnail_url text DEFAULT '',
  duration_seconds integer DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs viewable by everyone" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Admins manage songs" ON public.songs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
ALTER TABLE public.songs REPLICA IDENTITY FULL;

-- Storage bucket for songs (MP4 files)
INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read songs bucket" ON storage.objects FOR SELECT
  USING (bucket_id = 'songs');
CREATE POLICY "Admins upload songs bucket" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'songs' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update songs bucket" ON storage.objects FOR UPDATE
  USING (bucket_id = 'songs' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete songs bucket" ON storage.objects FOR DELETE
  USING (bucket_id = 'songs' AND has_role(auth.uid(), 'admin'::app_role));
