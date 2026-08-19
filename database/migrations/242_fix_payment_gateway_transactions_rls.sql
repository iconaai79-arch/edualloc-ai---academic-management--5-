-- Migration: Fix Permissive RLS on Payment Gateway Transaction Tables
-- Description: Replaces unrestricted "FOR ALL USING (true) WITH CHECK (true)" policy with scoped institutional tenancy RLS.

ALTER TABLE public.airtel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intasend_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncba_transactions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY['airtel_transactions', 'intasend_transactions', 'ncba_transactions'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Remove permissive policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_all_access" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy insert: %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy update: %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy delete: %s" ON public.%I', t, t);

        -- Scoped institutional multi-tenancy policies
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %s" ON public.%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy insert: %s" ON public.%I FOR INSERT WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy update: %s" ON public.%I FOR UPDATE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy delete: %s" ON public.%I FOR DELETE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
