-- Migration: Fix Permissive RLS on HIS MCH/CWC/NBU Tables
-- Description: Replaces unrestricted FOR ALL policies with scoped multi-tenant RLS.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'his_anc_records', 'his_delivery_records', 
        'his_cwc_immunizations', 'his_nbu_admissions'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS "Public access to %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
