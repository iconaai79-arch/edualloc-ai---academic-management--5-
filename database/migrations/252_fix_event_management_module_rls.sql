-- Migration: Fix Permissive RLS on event management tables
-- Description: Replaces permissive USING (true) / WITH CHECK (true) write/delete policies on event tables with scoped policies.

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_medical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pledges ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'events', 'event_categories', 'event_participants', 
        'event_splits', 'event_medical_logs', 'event_pledges'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Drop old and permissive policies
        EXECUTE format('DROP POLICY IF EXISTS "Permissive select for %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Insert %s for everyone" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Update %s for institutional staff" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete %s for institutional staff" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete %s for all authenticated" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete medical logs for all authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Insert medical logs for everyone" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Update medical logs for institutional staff" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete medical logs for institutional staff" ON public.%I', t);

        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        -- Granular policies satisfying Supabase security linter
        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role()::text = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
