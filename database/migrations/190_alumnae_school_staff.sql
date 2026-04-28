
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
    EXECUTE 'CREATE POLICY "School Staff Isolation" ON public.alumni_school_staff FOR ALL USING (true)';
END $policy_block$;

-- Trigger to log team changes if needed (Optional, but good for audit)
NOTIFY pgrst, 'reload schema';
