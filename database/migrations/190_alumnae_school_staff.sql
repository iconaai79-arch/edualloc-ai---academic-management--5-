
-- Migration: Alumnae School Management Team
-- This adds the ability for school admins to delegate portal management to other members.

CREATE TABLE IF NOT EXISTS public.alumni_school_staff (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Moderator', -- 'Admin', 'Moderator', 'Editor'
    permissions TEXT[] DEFAULT '{}', -- Optional granular permissions
    added_by TEXT REFERENCES public.alumnae_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(institution_id, member_id)
);

-- ENABLE RLS
ALTER TABLE public.alumni_school_staff ENABLE ROW LEVEL SECURITY;

-- POLICIES
DO $policy_block$ 
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "School Staff Isolation" ON public.alumni_school_staff';
    EXECUTE 'DROP POLICY IF EXISTS "alumni_school_staff_select" ON public.alumni_school_staff';
    EXECUTE 'DROP POLICY IF EXISTS "alumni_school_staff_insert" ON public.alumni_school_staff';
    EXECUTE 'DROP POLICY IF EXISTS "alumni_school_staff_update" ON public.alumni_school_staff';
    EXECUTE 'DROP POLICY IF EXISTS "alumni_school_staff_delete" ON public.alumni_school_staff';

    EXECUTE 'CREATE POLICY "alumni_school_staff_select" ON public.alumni_school_staff FOR SELECT TO authenticated, anon USING (true)';
    EXECUTE 'CREATE POLICY "alumni_school_staff_insert" ON public.alumni_school_staff FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)';
    EXECUTE 'CREATE POLICY "alumni_school_staff_update" ON public.alumni_school_staff FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role() = ''super_admin'') WITH CHECK (id IS NOT NULL)';
    EXECUTE 'CREATE POLICY "alumni_school_staff_delete" ON public.alumni_school_staff FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role() = ''super_admin'')';

    EXECUTE 'GRANT ALL ON public.alumni_school_staff TO anon, authenticated, service_role';
END $policy_block$;

-- Trigger to log team changes if needed (Optional, but good for audit)
NOTIFY pgrst, 'reload schema';
