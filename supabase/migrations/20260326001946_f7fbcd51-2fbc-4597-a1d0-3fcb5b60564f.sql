
-- 1. Admin can delete group messages
CREATE POLICY "Admins can delete group messages"
ON public.group_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Spin prizes table
CREATE TABLE public.spin_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  chance_percent numeric NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.spin_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prizes viewable by everyone" ON public.spin_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage prizes" ON public.spin_prizes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Spin results table
CREATE TABLE public.spin_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prize_id uuid REFERENCES public.spin_prizes(id) ON DELETE SET NULL,
  prize_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.spin_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spin results" ON public.spin_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spin results" ON public.spin_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all spin results" ON public.spin_results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 4. User spins table
CREATE TABLE public.user_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE UNIQUE,
  spins_total integer NOT NULL DEFAULT 0,
  spins_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spins" ON public.user_spins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own spins" ON public.user_spins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage spins" ON public.user_spins FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Default prizes
INSERT INTO public.spin_prizes (name, description, chance_percent, sort_order) VALUES
('Uang Tunai 2K', 'Hadiah uang tunai Rp2.000', 25, 1),
('PM Member 1', 'Private message dengan 1 member JKT48 pilihanmu', 25, 2),
('Uang Tunai 6K', 'Hadiah uang tunai Rp6.000', 20, 3),
('Uang Tunai 9K', 'Hadiah uang tunai Rp9.000', 15, 4),
('PM All Member', 'Private message dengan semua member JKT48', 10, 5),
('Membership 30H + 3PM', 'Membership 30 hari + 3 PM member JKT48', 5, 6);

-- 6. Auto allocate spins trigger
CREATE OR REPLACE FUNCTION public.allocate_spins_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IN ('confirmed', 'completed') AND (OLD.status IS NULL OR OLD.status = 'pending')) THEN
    INSERT INTO public.user_spins (user_id, purchase_id, spins_total, spins_used)
    VALUES (
      NEW.user_id,
      NEW.id,
      CASE WHEN NEW.total < 25000 THEN 1 ELSE 3 END,
      0
    )
    ON CONFLICT (purchase_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER allocate_spins_trigger
AFTER UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.allocate_spins_on_purchase();

-- 7. Ranking function (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_ranking_data()
RETURNS TABLE(
  user_id uuid,
  username text,
  profile_photo text,
  total_spent bigint,
  total_items bigint,
  purchase_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.profile_photo,
    SUM(pu.total)::bigint as total_spent,
    COALESCE(SUM(sub.item_qty), 0)::bigint as total_items,
    COUNT(DISTINCT pu.id)::bigint as purchase_count
  FROM profiles p
  INNER JOIN purchases pu ON pu.user_id = p.user_id AND pu.status IN ('confirmed', 'completed')
  LEFT JOIN (
    SELECT purchase_id, SUM(quantity) as item_qty FROM purchase_items GROUP BY purchase_id
  ) sub ON sub.purchase_id = pu.id
  GROUP BY p.user_id, p.username, p.profile_photo
  ORDER BY SUM(pu.total) DESC;
$$;

-- 8. Realtime for spin_prizes
ALTER PUBLICATION supabase_realtime ADD TABLE public.spin_prizes;
