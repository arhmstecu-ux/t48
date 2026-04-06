
-- Disable the profile_code trigger temporarily
DROP TRIGGER IF EXISTS generate_profile_code_trigger ON public.profiles;

-- Backfill profiles for all auth users missing profiles
-- Use a function to handle each user individually to avoid trigger conflicts
DO $$
DECLARE
  u RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR u IN 
    SELECT au.id, 
           COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
           COALESCE(au.email, '') as email,
           COALESCE(au.raw_user_meta_data->>'phone', '') as phone
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.id IS NULL
  LOOP
    -- Generate unique code
    attempts := 0;
    LOOP
      new_code := UPPER(SUBSTR(MD5(u.id::text || clock_timestamp()::text || attempts::text || random()::text), 1, 4));
      -- Check if code exists
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profile_code = new_code) THEN
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 50 THEN
        new_code := UPPER(SUBSTR(MD5(random()::text || clock_timestamp()::text), 1, 6));
        EXIT;
      END IF;
    END LOOP;
    
    INSERT INTO public.profiles (user_id, username, email, phone, profile_code)
    VALUES (u.id, u.username, u.email, u.phone, new_code)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- Backfill codes for any profiles still missing them
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE profile_code IS NULL
  LOOP
    attempts := 0;
    LOOP
      new_code := UPPER(SUBSTR(MD5(r.id::text || clock_timestamp()::text || attempts::text || random()::text), 1, 4));
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profile_code = new_code) THEN
        UPDATE public.profiles SET profile_code = new_code WHERE id = r.id;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 50 THEN
        new_code := UPPER(SUBSTR(MD5(random()::text || clock_timestamp()::text), 1, 6));
        UPDATE public.profiles SET profile_code = new_code WHERE id = r.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Recreate the profile_code trigger
CREATE TRIGGER generate_profile_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.profile_code IS NULL)
EXECUTE FUNCTION public.generate_profile_code();

-- Attach handle_new_user trigger on auth.users (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Attach coin balance trigger
DROP TRIGGER IF EXISTS create_coin_balance_on_profile ON public.profiles;
CREATE TRIGGER create_coin_balance_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_coin_balance_for_user();

-- Attach user level trigger
DROP TRIGGER IF EXISTS create_user_level_on_profile ON public.profiles;
CREATE TRIGGER create_user_level_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_level_for_profile();

-- Backfill coin_balances
INSERT INTO public.coin_balances (user_id, balance)
SELECT p.user_id, 0
FROM public.profiles p
LEFT JOIN public.coin_balances cb ON cb.user_id = p.user_id
WHERE cb.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Backfill user_levels
INSERT INTO public.user_levels (user_id)
SELECT p.user_id
FROM public.profiles p
LEFT JOIN public.user_levels ul ON ul.user_id = p.user_id
WHERE ul.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Notification triggers
DROP TRIGGER IF EXISTS notify_new_announcement ON public.announcements;
CREATE TRIGGER notify_new_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_announcement();

DROP TRIGGER IF EXISTS notify_new_product ON public.products;
CREATE TRIGGER notify_new_product
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_product();
