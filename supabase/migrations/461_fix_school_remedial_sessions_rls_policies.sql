-- Migration 461: Fix RLS policies on school_remedial_sessions
-- Ensures anon, authenticated, and service_role can select, insert, update, and delete
-- records in school_remedial_sessions without being blocked by restrictive delete policies.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        ALTER TABLE public.school_remedial_sessions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "school_remedial_sessions_select" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "school_remedial_sessions_insert" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "school_remedial_sessions_update" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "school_remedial_sessions_delete" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "school_remedial_sessions_all" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "Allow all for school_remedial_sessions" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_sessions" ON public.school_remedial_sessions;
        DROP POLICY IF EXISTS "Allow authenticated insert/update/delete for school_remedial_sessions" ON public.school_remedial_sessions;

        CREATE POLICY "school_remedial_sessions_all" ON public.school_remedial_sessions
            FOR ALL TO anon, authenticated, service_role
            USING (true)
            WITH CHECK (true);

        GRANT ALL ON public.school_remedial_sessions TO anon, authenticated, service_role;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
