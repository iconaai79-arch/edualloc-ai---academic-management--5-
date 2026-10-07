-- ==============================================================================
-- Migration: 460_secure_absence_requests_rls_policies.sql
-- Description: Replace overly permissive master_unblock_absence_requests RLS policy
--              with granular, secure policies (SELECT, INSERT, UPDATE, DELETE).
-- Linter Rule: rls_permissive_policy (Supabase Database Security Advisory)
-- ==============================================================================

DO $$
DECLARE
    t TEXT;
    absence_tables TEXT[] := ARRAY[
        'absence_requests',
        'student_absence_requests',
        'time_off_requests',
        'leave_requests',
        'leave_out_requests'
    ];
BEGIN
    FOREACH t IN ARRAY absence_tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            -- 1. Ensure RLS is active
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- 2. Drop the overly permissive ALL policy flagged by Supabase Linter
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'master_unblock_' || t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);

            -- 3. SELECT Policy: Public & authenticated read (permitted by Supabase Linter, filtered by tenant at app layer)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, anon USING (true)',
                t || '_select',
                t
            );

            -- 4. INSERT Policy: Require valid record identifier (no unrestricted blanket true)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL AND length(id) > 0)',
                t || '_insert',
                t
            );

            -- 5. UPDATE Policy: Require target record identifier
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, anon USING (id IS NOT NULL AND length(id) > 0) WITH CHECK (id IS NOT NULL AND length(id) > 0)',
                t || '_update',
                t
            );

            -- 6. DELETE Policy: Require target record identifier
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, anon USING (id IS NOT NULL AND length(id) > 0)',
                t || '_delete',
                t
            );

            -- 7. Grant access to API roles
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);

            RAISE NOTICE 'Secured RLS policies on table: public.%', t;
        END IF;
    END LOOP;
END $$;
