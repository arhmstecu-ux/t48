
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1) PROFILES: restrict SELECT to own row + admins (hides email/phone of others)
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile or admin views all"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Public-safe profile lookup (no email/phone) for cross-user UIs
CREATE OR REPLACE FUNCTION public.get_public_profiles_by_codes(_codes text[])
RETURNS TABLE(user_id uuid, username text, profile_photo text, profile_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, username, profile_photo, profile_code
  FROM public.profiles
  WHERE profile_code = ANY(_codes)
$$;

CREATE OR REPLACE FUNCTION public.get_public_profiles_by_ids(_ids uuid[])
RETURNS TABLE(user_id uuid, username text, profile_photo text, profile_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, username, profile_photo, profile_code
  FROM public.profiles
  WHERE user_id = ANY(_ids)
$$;

CREATE OR REPLACE FUNCTION public.list_public_profiles()
RETURNS TABLE(user_id uuid, username text, profile_photo text, profile_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, username, profile_photo, profile_code FROM public.profiles
$$;

-- 2) REMOVE SENSITIVE TABLES FROM REALTIME PUBLICATION
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.paid_livestream_access; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.paid_livestream_tokens; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.coin_balances; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.coin_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.coin_topup_requests; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 3) PAID LIVESTREAM SETTINGS: hide m3u8_url from non-admins
DROP POLICY IF EXISTS "Anyone authenticated can view settings" ON public.paid_livestream_settings;
CREATE POLICY "Authenticated view non-sensitive settings via fn"
  ON public.paid_livestream_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.get_paid_livestream_public()
RETURNS TABLE(
  id uuid, active_server text, youtube_url text, title text, description text,
  logo_url text, background_url text, start_time timestamptz, is_live boolean, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, active_server, youtube_url, title, description, logo_url,
         background_url, start_time, is_live, updated_at
  FROM public.paid_livestream_settings LIMIT 1
$$;

-- 4) COIN BALANCES: remove user self-update; add atomic spend RPC
DROP POLICY IF EXISTS "Users can update own coin balance" ON public.coin_balances;
DROP POLICY IF EXISTS "User insert own coin balance" ON public.coin_balances;

-- Remove user-self insert on coin_transactions
DROP POLICY IF EXISTS "Admin can insert coin transactions" ON public.coin_transactions;
CREATE POLICY "Admins insert coin transactions"
  ON public.coin_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.spend_coins(_amount int, _type text, _description text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance int; v_new int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT balance INTO v_balance FROM public.coin_balances WHERE user_id = auth.uid() FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'No balance'; END IF;
  IF v_balance < _amount THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
  v_new := v_balance - _amount;
  UPDATE public.coin_balances SET balance = v_new, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.coin_transactions(user_id, amount, type, description)
    VALUES (auth.uid(), -_amount, COALESCE(_type,'purchase'), _description);
  RETURN v_new;
END $$;

-- 5) REPLAY PURCHASES: server-side atomic purchase
DROP POLICY IF EXISTS "Users can insert own replay purchases" ON public.replay_purchases;

CREATE OR REPLACE FUNCTION public.purchase_replay(_video_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_price int := 2; v_balance int; v_already uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_already FROM public.replay_purchases WHERE user_id = auth.uid() AND video_id = _video_id LIMIT 1;
  IF v_already IS NOT NULL THEN RETURN true; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.replay_videos WHERE id = _video_id) THEN RAISE EXCEPTION 'Invalid video'; END IF;
  SELECT balance INTO v_balance FROM public.coin_balances WHERE user_id = auth.uid() FOR UPDATE;
  IF COALESCE(v_balance,0) < v_price THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
  UPDATE public.coin_balances SET balance = balance - v_price, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.coin_transactions(user_id, amount, type, description)
    VALUES (auth.uid(), -v_price, 'purchase', 'Replay purchase');
  INSERT INTO public.replay_purchases(user_id, video_id, coin_amount) VALUES (auth.uid(), _video_id, v_price);
  RETURN true;
END $$;

-- 6) REPLAY VIDEOS: hide password from non-admin SELECT
DROP POLICY IF EXISTS "Replay videos viewable by authenticated" ON public.replay_videos;
CREATE POLICY "Admins view all replay videos"
  ON public.replay_videos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.list_replay_videos()
RETURNS TABLE(id uuid, title text, youtube_url text, created_at timestamptz, has_password boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, youtube_url, created_at, (password IS NOT NULL AND password <> '') AS has_password
  FROM public.replay_videos ORDER BY created_at DESC
$$;

-- 7) SPIN WHEEL: server-side prize selection
DROP POLICY IF EXISTS "Users can insert own spin results" ON public.spin_results;
DROP POLICY IF EXISTS "Users can update own spins consume only" ON public.user_spins;

CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS TABLE(prize_id uuid, prize_name text, prize_description text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_spin record; v_total numeric; v_rand numeric; v_acc numeric := 0; v_prize record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, spins_total, spins_used INTO v_spin FROM public.user_spins
    WHERE user_id = auth.uid() AND spins_total > spins_used
    ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
  IF v_spin.id IS NULL THEN RAISE EXCEPTION 'No spins available'; END IF;
  SELECT COALESCE(SUM(chance_percent),0) INTO v_total FROM public.spin_prizes;
  IF v_total <= 0 THEN RAISE EXCEPTION 'No prizes configured'; END IF;
  v_rand := random() * v_total;
  FOR v_prize IN SELECT * FROM public.spin_prizes ORDER BY sort_order ASC LOOP
    v_acc := v_acc + v_prize.chance_percent;
    IF v_rand <= v_acc THEN
      UPDATE public.user_spins SET spins_used = spins_used + 1 WHERE id = v_spin.id;
      INSERT INTO public.spin_results(user_id, prize_id, prize_name)
        VALUES (auth.uid(), v_prize.id, v_prize.name);
      prize_id := v_prize.id; prize_name := v_prize.name; prize_description := v_prize.description;
      RETURN NEXT; RETURN;
    END IF;
  END LOOP;
  -- fallback: last prize
  SELECT * INTO v_prize FROM public.spin_prizes ORDER BY sort_order DESC LIMIT 1;
  UPDATE public.user_spins SET spins_used = spins_used + 1 WHERE id = v_spin.id;
  INSERT INTO public.spin_results(user_id, prize_id, prize_name)
    VALUES (auth.uid(), v_prize.id, v_prize.name);
  prize_id := v_prize.id; prize_name := v_prize.name; prize_description := v_prize.description;
  RETURN NEXT;
END $$;

-- 8) USER LEVELS: remove user self-insert (trigger handles)
DROP POLICY IF EXISTS "User can insert own level" ON public.user_levels;
DROP POLICY IF EXISTS "System can update levels" ON public.user_levels;

-- 9) STORAGE: restrict listing on paid-live bucket (only admins list; users access by signed URL/known path)
DROP POLICY IF EXISTS "Public can read paid-live" ON storage.objects;
DROP POLICY IF EXISTS "paid-live admin manage" ON storage.objects;
CREATE POLICY "paid-live admin manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'paid-live' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'paid-live' AND public.has_role(auth.uid(),'admin'));
-- Since bucket is public, individual file reads via direct URL still work, but listing requires policy:
-- (no listing policy = no listing for anon/auth; admins covered by ALL above)

-- 10) Token validation realtime alternative: rely on validate_paid_token RPC (already exists)
