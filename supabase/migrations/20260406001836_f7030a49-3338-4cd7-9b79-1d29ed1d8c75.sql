
-- Attach the trigger to generate profile_code on INSERT
CREATE TRIGGER generate_profile_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.profile_code IS NULL)
EXECUTE FUNCTION public.generate_profile_code();

-- Backfill all existing profiles that have no profile_code
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
      new_code := UPPER(SUBSTR(MD5(r.id::text || NOW()::text || attempts::text), 1, 4));
      BEGIN
        UPDATE public.profiles SET profile_code = new_code WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 20 THEN
          new_code := UPPER(SUBSTR(MD5(random()::text), 1, 6));
          UPDATE public.profiles SET profile_code = new_code WHERE id = r.id;
          EXIT;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;
