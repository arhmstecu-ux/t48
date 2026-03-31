
-- Add coin_price column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS coin_price integer DEFAULT 0;

-- Create replay_purchases table for tracking coin-purchased replays
CREATE TABLE IF NOT EXISTS public.replay_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.replay_videos(id) ON DELETE CASCADE,
  coin_amount integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.replay_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own replay purchases" ON public.replay_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own replay purchases" ON public.replay_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all replay purchases" ON public.replay_purchases
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for replay_purchases
ALTER PUBLICATION supabase_realtime ADD TABLE public.replay_purchases;
