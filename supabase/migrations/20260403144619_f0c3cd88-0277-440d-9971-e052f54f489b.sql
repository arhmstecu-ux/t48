
-- Fix: Allow users to update their own coin balance (needed for replay purchase)
CREATE POLICY "Users can update own coin balance" ON public.coin_balances FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add profile_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_code text UNIQUE;

-- Generate unique codes for existing profiles
UPDATE public.profiles SET profile_code = UPPER(SUBSTR(MD5(user_id::text || created_at::text), 1, 4)) WHERE profile_code IS NULL;

-- Function to generate unique profile code on new profile
CREATE OR REPLACE FUNCTION public.generate_profile_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  attempts int := 0;
BEGIN
  LOOP
    new_code := UPPER(SUBSTR(MD5(NEW.user_id::text || NOW()::text || attempts::text), 1, 4));
    BEGIN
      NEW.profile_code := new_code;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 20 THEN
        new_code := UPPER(SUBSTR(MD5(random()::text), 1, 6));
        NEW.profile_code := new_code;
        RETURN NEW;
      END IF;
    END;
  END LOOP;
END;
$$;

CREATE TRIGGER set_profile_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.profile_code IS NULL)
EXECUTE FUNCTION public.generate_profile_code();

-- Livestream blacklist table
CREATE TABLE public.livestream_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code text NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.livestream_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view blacklist" ON public.livestream_blacklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage blacklist" ON public.livestream_blacklist FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Livestream moderators table
CREATE TABLE public.livestream_moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.livestream_moderators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view moderators" ON public.livestream_moderators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage moderators" ON public.livestream_moderators FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
