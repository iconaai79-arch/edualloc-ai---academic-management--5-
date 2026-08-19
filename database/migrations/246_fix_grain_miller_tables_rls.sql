-- Migration: Fix Permissive RLS on Grain Miller Tables
-- Description: Replaces "Allow public access..." permissive policies with scoped institutional tenancy RLS.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'weighbridge_intake_tickets', 'grain_suppliers', 'milling_silos', 
        'milling_batch_runs', 'flour_packaging_shifts', 'animal_feed_batches', 
        'grain_sale_orders'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS "Allow public access to %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO authenticated, anon, service_role', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
