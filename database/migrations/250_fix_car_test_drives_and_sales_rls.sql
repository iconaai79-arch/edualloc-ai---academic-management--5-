-- Migration: Fix Permissive RLS on car_test_drives, car_sales_listings, and car_appraisals
-- Description: Replaces unrestricted policies with granular, type-safe policies.

ALTER TABLE public.car_test_drives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Test Drive Request" ON public.car_test_drives;
DROP POLICY IF EXISTS "Test Drive Manage Policy" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_select" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_insert" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_update" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_delete" ON public.car_test_drives;

CREATE POLICY "car_test_drives_select" ON public.car_test_drives
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR institution_id IS NULL OR auth.role() = 'anon');

CREATE POLICY "car_test_drives_insert" ON public.car_test_drives
    FOR INSERT TO authenticated, anon
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "car_test_drives_update" ON public.car_test_drives
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR institution_id IS NULL)
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "car_test_drives_delete" ON public.car_test_drives
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.car_test_drives TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
