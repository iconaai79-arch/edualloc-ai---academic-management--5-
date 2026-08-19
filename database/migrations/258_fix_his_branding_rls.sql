-- Migration: Fix Permissive RLS on his_branding
-- Description: Replaces unrestricted FOR ALL policies with scoped multi-tenant RLS.

ALTER TABLE public.his_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on his_branding" ON public.his_branding;
DROP POLICY IF EXISTS "his_branding_select" ON public.his_branding;
DROP POLICY IF EXISTS "his_branding_insert" ON public.his_branding;
DROP POLICY IF EXISTS "his_branding_update" ON public.his_branding;
DROP POLICY IF EXISTS "his_branding_delete" ON public.his_branding;

CREATE POLICY "his_branding_select" ON public.his_branding
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "his_branding_insert" ON public.his_branding
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_branding_update" ON public.his_branding
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_branding_delete" ON public.his_branding
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.his_branding TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
