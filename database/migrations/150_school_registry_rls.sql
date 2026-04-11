
-- Row Level Security for Global School Registry
ALTER TABLE school_registry ENABLE ROW LEVEL SECURITY;

-- 1. Everyone (even anonymous users) can view the global school registry
-- This is necessary for the Alumnae Deep-Linking and Registration flow to find schools by slug/name.
DROP POLICY IF EXISTS "Public select: school_registry" ON school_registry;
CREATE POLICY "Public select: school_registry" ON school_registry
FOR SELECT USING (true);

-- 2. Only Super Admins can manage the global school registry
-- This covers INSERT, UPDATE, and DELETE.
DROP POLICY IF EXISTS "Super Admin manage: school_registry" ON school_registry;
CREATE POLICY "Super Admin manage: school_registry" ON school_registry
FOR ALL 
USING (public.get_curr_user_role() = 'super_admin')
WITH CHECK (public.get_curr_user_role() = 'super_admin');
