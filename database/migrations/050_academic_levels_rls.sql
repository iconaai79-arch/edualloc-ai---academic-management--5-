-- 050_academic_levels_rls.sql
-- Specific RLS for academic_levels (redundant but explicit)

-- Enable RLS
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.academic_levels TO anon, authenticated, service_role;

-- Drop existing if any
DROP POLICY IF EXISTS "academic_levels_tenancy_select" ON public.academic_levels;
DROP POLICY IF EXISTS "academic_levels_tenancy_manage" ON public.academic_levels;

-- SELECT: All authenticated users in the same institution
CREATE POLICY "academic_levels_tenancy_select"
    ON public.academic_levels
    FOR SELECT
    USING (institution_id::text = public.get_curr_user_inst_id());

-- ALL: Only Admins and Head Teachers can manage
CREATE POLICY "academic_levels_tenancy_manage"
    ON public.academic_levels
    FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        AND public.get_curr_user_role() IN ('admin', 'super_admin', 'head_teacher')
    );
