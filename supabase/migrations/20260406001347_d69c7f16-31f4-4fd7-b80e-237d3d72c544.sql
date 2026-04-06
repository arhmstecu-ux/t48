
-- Allow all authenticated users to read user_roles (so owner/mod badges are visible to everyone)
CREATE POLICY "All authenticated users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
