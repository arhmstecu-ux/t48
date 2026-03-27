
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  profile_photo text,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group messages" ON public.group_messages FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members" ON public.group_members FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 10,
  max_uses integer NOT NULL DEFAULT 100,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vouchers viewable by everyone" ON public.vouchers FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage vouchers" ON public.vouchers FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.voucher_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(voucher_id, user_id)
);

ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voucher usage" ON public.voucher_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voucher usage" ON public.voucher_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all voucher usage" ON public.voucher_usage FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
