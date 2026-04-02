
CREATE TABLE public.user_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  level integer NOT NULL DEFAULT 1,
  total_topup_coins integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all levels" ON public.user_levels FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage levels" ON public.user_levels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "User can insert own level" ON public.user_levels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update levels" ON public.user_levels FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.level_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL UNIQUE,
  reward_name text NOT NULL DEFAULT '',
  reward_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.level_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view level rewards" ON public.level_rewards FOR SELECT TO public USING (true);
CREATE POLICY "Admin can manage level rewards" ON public.level_rewards FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.user_levels (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_user_level_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_levels (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_profile_create_level
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_user_level_for_profile();

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.level_rewards;
