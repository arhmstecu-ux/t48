
-- Add image_url to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admin can insert notifications for anyone
CREATE POLICY "Admin can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also allow system/trigger inserts
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admin can view all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify all users on new announcement
CREATE OR REPLACE FUNCTION public.notify_on_new_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.user_id, '📢 Pengumuman Baru', NEW.title, 'announcement'
  FROM public.profiles p;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_announcement();

-- Function to notify all users on new product
CREATE OR REPLACE FUNCTION public.notify_on_new_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.user_id, '🛍️ Produk Baru', NEW.name, 'product'
  FROM public.profiles p;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_product
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_product();
