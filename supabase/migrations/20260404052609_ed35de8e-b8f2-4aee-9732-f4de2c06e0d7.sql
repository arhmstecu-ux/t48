
-- Add show_date to products for countdown
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_date timestamp with time zone DEFAULT NULL;

-- Ensure all existing profiles have a profile_code
UPDATE public.profiles 
SET profile_code = UPPER(SUBSTR(MD5(user_id::text || NOW()::text || id::text), 1, 4))
WHERE profile_code IS NULL;

-- Add admin role to app_role enum if not exists (admin already exists)
-- Create admin_role table to differentiate admin from owner
-- Admins can only manage: livestream, group, catalog
