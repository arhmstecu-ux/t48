
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_plan TEXT;

CREATE OR REPLACE FUNCTION public.grant_premium_by_code(_code TEXT, _plan TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days INT;
  _profile RECORD;
  _base TIMESTAMPTZ;
  _new_until TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tidak diizinkan');
  END IF;

  IF _plan = 'weekly' THEN _days := 7;
  ELSIF _plan = 'monthly' THEN _days := 30;
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Plan tidak valid'); END IF;

  SELECT * INTO _profile FROM public.profiles
    WHERE UPPER(profile_code) = UPPER(REPLACE(_code, '#', '')) LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ID pembeli tidak ditemukan');
  END IF;

  _base := GREATEST(COALESCE(_profile.premium_until, now()), now());
  _new_until := _base + (_days || ' days')::INTERVAL;

  UPDATE public.profiles
    SET premium_until = _new_until, premium_plan = _plan
    WHERE id = _profile.id;

  RETURN jsonb_build_object('success', true, 'username', _profile.username, 'expires_at', _new_until, 'plan', _plan);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_premium_by_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tidak diizinkan');
  END IF;

  UPDATE public.profiles
    SET premium_until = NULL, premium_plan = NULL
    WHERE UPPER(profile_code) = UPPER(REPLACE(_code, '#', ''));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_premium_users()
RETURNS TABLE(user_id UUID, username TEXT, profile_code TEXT, premium_plan TEXT, premium_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.username, p.profile_code, p.premium_plan, p.premium_until
    FROM public.profiles p
    WHERE p.premium_until IS NOT NULL AND p.premium_until > now()
    ORDER BY p.premium_until DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_premium_by_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_premium_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_premium_users() TO authenticated;
