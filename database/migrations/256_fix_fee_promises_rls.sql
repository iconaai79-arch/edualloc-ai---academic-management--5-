-- Migration: Fix Permissive RLS on fee_promises
-- Description: Replaces unrestricted FOR ALL policies with scoped multi-tenant RLS.

ALTER TABLE public.fee_promises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutional tenancy manage" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy read" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy insert" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy update" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy delete" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy all" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow all on fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated read fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated insert fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated update fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated delete fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "fee_promises_policy" ON public.fee_promises;

DROP POLICY IF EXISTS "fee_promises_select" ON public.fee_promises;
DROP POLICY IF EXISTS "fee_promises_insert" ON public.fee_promises;
DROP POLICY IF EXISTS "fee_promises_update" ON public.fee_promises;
DROP POLICY IF EXISTS "fee_promises_delete" ON public.fee_promises;

CREATE POLICY "fee_promises_select" ON public.fee_promises
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "fee_promises_insert" ON public.fee_promises
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "fee_promises_update" ON public.fee_promises
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "fee_promises_delete" ON public.fee_promises
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.fee_promises TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
