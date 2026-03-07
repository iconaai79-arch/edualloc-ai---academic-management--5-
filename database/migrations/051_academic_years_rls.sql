-- 051_academic_years_rls.sql
-- Specific RLS for academic_years

-- Enable RLS
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.academic_years TO anon, authenticated, service_role;

-- Drop existing if any
DROP POLICY IF EXISTS "academic_years_tenancy_select" ON public.academic_years;
DROP POLICY IF EXISTS "academic_years_tenancy_manage" ON public.academic_years;

-- SELECT: All authenticated users in the same institution
CREATE POLICY "academic_years_tenancy_select"
    ON public.academic_years
    FOR SELECT
    USING (institution_id::text = public.get_curr_user_inst_id());

-- ALL: Only Admins can manage academic years
CREATE POLICY "academic_years_tenancy_manage"
    ON public.academic_years
    FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        AND public.get_curr_user_role() IN ('admin', 'super_admin', 'head_teacher')
    );
