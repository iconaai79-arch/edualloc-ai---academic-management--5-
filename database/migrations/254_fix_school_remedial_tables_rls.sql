-- Migration: Fix Permissive RLS on School Remedial Tables
-- Description: Replaces unrestricted FOR ALL policies with granular RLS policies.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'school_remedial_subjects', 'school_remedial_sessions', 
        'school_remedial_payouts', 'school_remedial_rate_settings', 
        'school_remedial_allocations'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS "Allow all for %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select for %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert/update/delete for %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role()::text = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
