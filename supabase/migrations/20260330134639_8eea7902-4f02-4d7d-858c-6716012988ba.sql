
-- Coin balance table
CREATE TABLE public.coin_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin balance" ON public.coin_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all coin balances" ON public.coin_balances FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update coin balances" ON public.coin_balances FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert coin balances" ON public.coin_balances FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User insert own coin balance" ON public.coin_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Coin top-up requests table
CREATE TABLE public.coin_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  coin_amount integer NOT NULL,
  price integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
ALTER TABLE public.coin_topup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topup requests" ON public.coin_topup_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create topup requests" ON public.coin_topup_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all topup requests" ON public.coin_topup_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update topup requests" ON public.coin_topup_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Coin transaction log
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can insert coin transactions" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE POLICY "Admin can view all coin transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_topup_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;

-- Auto-create coin balance on profile creation
CREATE OR REPLACE FUNCTION public.create_coin_balance_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.coin_balances (user_id, balance) VALUES (NEW.user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_coins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_coin_balance_for_user();
