
-- Watch links: single-use (1 person, 24h) or group (max 150 people, 24h)
CREATE TABLE public.paid_livestream_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  link_type text NOT NULL CHECK (link_type IN ('single','group')),
  max_uses int NOT NULL DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  label text DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_livestream_links TO authenticated;
GRANT ALL ON public.paid_livestream_links TO service_role;

ALTER TABLE public.paid_livestream_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage paid links"
  ON public.paid_livestream_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Track which devices have claimed a link (for single-use binding + group capacity)
CREATE TABLE public.paid_livestream_link_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.paid_livestream_links(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (link_id, fingerprint)
);

GRANT SELECT, INSERT ON public.paid_livestream_link_claims TO authenticated, anon;
GRANT ALL ON public.paid_livestream_link_claims TO service_role;

ALTER TABLE public.paid_livestream_link_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read claims"
  ON public.paid_livestream_link_claims FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_livestream_link_claims;
ALTER TABLE public.paid_livestream_links REPLICA IDENTITY FULL;
ALTER TABLE public.paid_livestream_link_claims REPLICA IDENTITY FULL;

-- Generate 8-char hex token (last 4 chars used as visible watermark suffix)
CREATE OR REPLACE FUNCTION public.create_paid_link(_type text, _max int, _label text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
  _final_max int;
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tidak diizinkan');
  END IF;
  IF _type NOT IN ('single','group') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tipe tidak valid');
  END IF;
  IF _type = 'single' THEN
    _final_max := 1;
  ELSE
    _final_max := GREATEST(1, LEAST(150, COALESCE(_max, 150)));
  END IF;

  LOOP
    _token := UPPER(SUBSTR(MD5(random()::text || clock_timestamp()::text), 1, 8));
    BEGIN
      INSERT INTO public.paid_livestream_links (token, link_type, max_uses, label, created_by)
      VALUES (_token, _type, _final_max, COALESCE(_label,''), auth.uid())
      RETURNING id INTO _id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'id', _id,
    'token', _token,
    'suffix', RIGHT(_token, 4),
    'expires_at', (now() + interval '24 hours'),
    'max_uses', _final_max,
    'type', _type
  );
END;
$$;

-- Validate + claim. Allowed for anon and authenticated.
CREATE OR REPLACE FUNCTION public.validate_and_claim_link(_token text, _fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link RECORD;
  _existing RECORD;
  _live_count int;
BEGIN
  IF _token IS NULL OR length(_token) < 4 OR _fingerprint IS NULL OR length(_fingerprint) < 4 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Parameter tidak valid');
  END IF;

  SELECT * INTO _link FROM public.paid_livestream_links
    WHERE token = UPPER(_token) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Link tidak ditemukan');
  END IF;
  IF _link.revoked THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Link sudah dicabut');
  END IF;
  IF _link.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Link sudah kadaluarsa');
  END IF;

  -- Existing claim from same device → just allow
  SELECT * INTO _existing FROM public.paid_livestream_link_claims
    WHERE link_id = _link.id AND fingerprint = _fingerprint LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('valid', true, 'type', _link.link_type, 'suffix', RIGHT(_link.token,4),
      'expires_at', _link.expires_at, 'label', _link.label, 'used_count', _link.used_count, 'max_uses', _link.max_uses);
  END IF;

  -- New device → check capacity
  SELECT count(*) INTO _live_count FROM public.paid_livestream_link_claims WHERE link_id = _link.id;
  IF _live_count >= _link.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error',
      CASE WHEN _link.link_type = 'single'
        THEN 'Link sekali pakai sudah digunakan perangkat lain'
        ELSE 'Kapasitas link sudah penuh (' || _link.max_uses || ' orang)'
      END);
  END IF;

  INSERT INTO public.paid_livestream_link_claims (link_id, fingerprint)
    VALUES (_link.id, _fingerprint)
    ON CONFLICT (link_id, fingerprint) DO NOTHING;
  UPDATE public.paid_livestream_links
    SET used_count = (SELECT count(*) FROM public.paid_livestream_link_claims WHERE link_id = _link.id)
    WHERE id = _link.id;

  RETURN jsonb_build_object('valid', true, 'type', _link.link_type, 'suffix', RIGHT(_link.token,4),
    'expires_at', _link.expires_at, 'label', _link.label,
    'used_count', _live_count + 1, 'max_uses', _link.max_uses);
END;
$$;

-- Allow anon to call validate function
GRANT EXECUTE ON FUNCTION public.validate_and_claim_link(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_paid_link(text, int, text) TO authenticated;

-- Admin list including live claim count
CREATE OR REPLACE FUNCTION public.list_paid_links()
RETURNS TABLE(id uuid, token text, link_type text, max_uses int, used_count int,
              label text, expires_at timestamptz, revoked boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN; END IF;
  RETURN QUERY
    SELECT l.id, l.token, l.link_type, l.max_uses,
      (SELECT count(*)::int FROM public.paid_livestream_link_claims c WHERE c.link_id = l.id) AS used_count,
      l.label, l.expires_at, l.revoked, l.created_at
    FROM public.paid_livestream_links l
    ORDER BY l.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_paid_links() TO authenticated;
