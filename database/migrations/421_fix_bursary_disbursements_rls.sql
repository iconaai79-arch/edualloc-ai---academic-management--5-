-- Migration: 421_fix_bursary_disbursements_rls.sql
-- Purpose: Fix permissive RLS on bursary_disbursements table by replacing bursary_disbursements_all with scoped multi-tenant RLS policies.

ALTER TABLE public.bursary_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bursary_disbursements_all" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_select" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_insert" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_update" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_delete" ON public.bursary_disbursements;

CREATE POLICY "bursary_disbursements_select" ON public.bursary_disbursements
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "bursary_disbursements_insert" ON public.bursary_disbursements
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "bursary_disbursements_update" ON public.bursary_disbursements
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "bursary_disbursements_delete" ON public.bursary_disbursements
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.bursary_disbursements TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
