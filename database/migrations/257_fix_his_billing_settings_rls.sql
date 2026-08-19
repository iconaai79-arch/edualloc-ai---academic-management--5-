-- Migration: Fix Permissive RLS on his_billing_settings
-- Description: Replaces unrestricted RLS policies with scoped multi-tenant RLS.

ALTER TABLE public.his_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_billing_settings_select" ON public.his_billing_settings;
DROP POLICY IF EXISTS "his_billing_settings_insert" ON public.his_billing_settings;
DROP POLICY IF EXISTS "his_billing_settings_update" ON public.his_billing_settings;
DROP POLICY IF EXISTS "his_billing_settings_delete" ON public.his_billing_settings;

CREATE POLICY "his_billing_settings_select" ON public.his_billing_settings
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_billing_settings_insert" ON public.his_billing_settings
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_billing_settings_update" ON public.his_billing_settings
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_billing_settings_delete" ON public.his_billing_settings
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.his_billing_settings TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
