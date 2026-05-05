CREATE TABLE IF NOT EXISTS public.paid_livestream_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text,
  expires_at timestamptz NOT NULL,
  banned boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plt_token ON public.paid_livestream_tokens(token);

ALTER TABLE public.paid_livestream_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tokens to validate"
ON public.paid_livestream_tokens FOR SELECT USING (true);

CREATE POLICY "Admins can insert tokens"
ON public.paid_livestream_tokens FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tokens"
ON public.paid_livestream_tokens FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tokens"
ON public.paid_livestream_tokens FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_tokens;