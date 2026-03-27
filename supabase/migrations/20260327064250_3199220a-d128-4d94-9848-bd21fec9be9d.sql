
-- Livestream comments table
CREATE TABLE public.livestream_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  profile_photo text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.livestream_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read livestream comments"
  ON public.livestream_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert their own comments"
  ON public.livestream_comments FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can delete any comment"
  ON public.livestream_comments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own comments"
  ON public.livestream_comments FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id::text);

ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_comments;

-- Livestream viewers tracking
CREATE TABLE public.livestream_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL,
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE public.livestream_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read viewers"
  ON public.livestream_viewers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upsert their own viewer row"
  ON public.livestream_viewers FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own viewer row"
  ON public.livestream_viewers FOR UPDATE TO authenticated USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own viewer row"
  ON public.livestream_viewers FOR DELETE TO authenticated USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can delete any viewer"
  ON public.livestream_viewers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_viewers;
