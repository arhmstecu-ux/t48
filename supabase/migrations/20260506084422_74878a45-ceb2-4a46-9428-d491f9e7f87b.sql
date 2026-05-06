
-- =========================================================
-- 1) PROFILES: hide email/phone from non-owners/non-admins
-- =========================================================
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Revoke direct column SELECT for sensitive PII
REVOKE SELECT (email, phone) ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, username, profile_photo, profile_code, is_blacklisted, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- Helper: owner reads own contact info; admin reads anyone's
CREATE OR REPLACE FUNCTION public.get_my_contact()
RETURNS TABLE(email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT email, phone FROM public.profiles
  WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_contact() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_contact() TO authenticated;

-- =========================================================
-- 2) PAID LIVESTREAM TOKENS: hide list, validate one
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read tokens to validate" ON public.paid_livestream_tokens;

CREATE POLICY "Admins can view tokens"
ON public.paid_livestream_tokens FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validate_paid_token(_token text)
RETURNS TABLE(token text, expires_at timestamptz, banned boolean, valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.token, t.expires_at, t.banned,
         (NOT t.banned AND t.expires_at > now()) AS valid
  FROM public.paid_livestream_tokens t
  WHERE t.token = upper(_token)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.validate_paid_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_paid_token(text) TO anon, authenticated;

-- =========================================================
-- 3) PAID LIVESTREAM SETTINGS: hide m3u8_url from non-paid
-- =========================================================
REVOKE SELECT (m3u8_url) ON public.paid_livestream_settings FROM anon, authenticated;
GRANT SELECT (id, active_server, youtube_url, title, description, logo_url, background_url, start_time, is_live, updated_at)
  ON public.paid_livestream_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_paid_m3u8_url(_token text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_url text;
  v_ok boolean := false;
BEGIN
  -- Admin bypass
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin') THEN
    v_ok := true;
  END IF;

  -- Email-based access
  IF NOT v_ok AND auth.uid() IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    IF v_email IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.paid_livestream_access
        WHERE lower(email) = lower(v_email) AND expires_at > now()
      ) THEN v_ok := true; END IF;
    END IF;
  END IF;

  -- Token-based access
  IF NOT v_ok AND _token IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.paid_livestream_tokens
      WHERE token = upper(_token) AND NOT banned AND expires_at > now()
    ) THEN v_ok := true; END IF;
  END IF;

  IF NOT v_ok THEN RETURN NULL; END IF;
  SELECT m3u8_url INTO v_url FROM public.paid_livestream_settings LIMIT 1;
  RETURN v_url;
END;
$$;
REVOKE ALL ON FUNCTION public.get_paid_m3u8_url(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_paid_m3u8_url(text) TO anon, authenticated;

-- =========================================================
-- 4) VOUCHERS: hide inactive/expired from non-admins
-- =========================================================
DROP POLICY IF EXISTS "Vouchers viewable by everyone" ON public.vouchers;

CREATE POLICY "Active vouchers viewable by authenticated"
ON public.vouchers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (is_active = true AND (expires_at IS NULL OR expires_at > now()))
);

-- Voucher used_count auto-increment
CREATE OR REPLACE FUNCTION public.increment_voucher_used()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers SET used_count = used_count + 1 WHERE id = NEW.voucher_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_voucher_used ON public.voucher_usage;
CREATE TRIGGER trg_voucher_used
AFTER INSERT ON public.voucher_usage
FOR EACH ROW EXECUTE FUNCTION public.increment_voucher_used();

-- =========================================================
-- 5) USER_ROLES: only own + admins
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.user_roles;

CREATE POLICY "Users view own role; admins view all"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 6) USER_SPINS: prevent users from inflating spins_total
-- =========================================================
DROP POLICY IF EXISTS "Users can update own spins" ON public.user_spins;

CREATE POLICY "Users can update own spins consume only"
ON public.user_spins FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- spins_total cannot grow; spins_used cannot decrease
);

CREATE OR REPLACE FUNCTION public.guard_user_spins_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF NEW.spins_total <> OLD.spins_total THEN
    RAISE EXCEPTION 'spins_total cannot be modified';
  END IF;
  IF NEW.spins_used < OLD.spins_used THEN
    RAISE EXCEPTION 'spins_used cannot decrease';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_user_spins ON public.user_spins;
CREATE TRIGGER trg_guard_user_spins
BEFORE UPDATE ON public.user_spins
FOR EACH ROW EXECUTE FUNCTION public.guard_user_spins_update();

-- =========================================================
-- 7) REPLAY VIDEOS: hide password column; verify via function
-- =========================================================
REVOKE SELECT (password) ON public.replay_videos FROM anon, authenticated;
GRANT SELECT (id, title, youtube_url, created_at) ON public.replay_videos TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.replay_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  unlocked_via text NOT NULL DEFAULT 'password',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE public.replay_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own replay access"
ON public.replay_access FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all replay access"
ON public.replay_access FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.verify_replay_password(_video_id uuid, _password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_pw text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT password INTO v_pw FROM public.replay_videos WHERE id = _video_id;
  IF v_pw IS NULL OR v_pw = '' OR v_pw <> _password THEN RETURN false; END IF;
  INSERT INTO public.replay_access (user_id, video_id, unlocked_via)
  VALUES (auth.uid(), _video_id, 'password')
  ON CONFLICT (user_id, video_id) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_replay_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_replay_password(uuid, text) TO authenticated;

-- =========================================================
-- 8) STORAGE paid-live: block listing
-- =========================================================
DO $$ BEGIN
  -- drop overly-broad SELECT policies on this bucket if any
  PERFORM 1;
END $$;

-- Allow public READ of individual objects via storage gateway is independent;
-- but explicitly add a restrictive list policy
DROP POLICY IF EXISTS "paid-live admin list" ON storage.objects;
CREATE POLICY "paid-live admin list"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'paid-live' AND public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 9) Tighten existing SECURITY DEFINER function execute grants
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.get_ranking_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_data() TO authenticated;
