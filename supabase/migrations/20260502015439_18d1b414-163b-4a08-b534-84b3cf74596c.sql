
-- Settings table (single row pattern, key-value flexible)
CREATE TABLE public.paid_livestream_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_server text NOT NULL DEFAULT 'youtube', -- 'youtube' | 'idn'
  youtube_url text NOT NULL DEFAULT '',
  m3u8_url text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT 'Livestream Berbayar',
  description text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  background_url text NOT NULL DEFAULT '',
  start_time timestamptz,
  is_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_livestream_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings"
  ON public.paid_livestream_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage settings"
  ON public.paid_livestream_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed one row
INSERT INTO public.paid_livestream_settings DEFAULT VALUES;

-- Access list (email-based)
CREATE TABLE public.paid_livestream_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_livestream_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage access"
  ON public.paid_livestream_access FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own access"
  ON public.paid_livestream_access FOR SELECT TO authenticated
  USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE INDEX idx_paid_access_email ON public.paid_livestream_access (LOWER(email));

-- Chat
CREATE TABLE public.paid_livestream_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  profile_photo text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_livestream_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read chat"
  ON public.paid_livestream_chat FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert own chat"
  ON public.paid_livestream_chat FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete chat"
  ON public.paid_livestream_chat FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own chat"
  ON public.paid_livestream_chat FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_access;
