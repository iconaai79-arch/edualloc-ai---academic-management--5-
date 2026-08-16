-- ==============================================================================
-- Migration: 339_fix_function_search_path_security.sql
-- Description: Fix role mutable search_path warning on public.safe_delete_records
--              and all other public functions in Supabase / PostgreSQL.
-- ==============================================================================

-- 1. Explicitly secure public.safe_delete_records if it exists
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'safe_delete_records'
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE 'Fixed search_path for public.%(%)', r.proname, r.args;
    END LOOP;
END $$;

-- 2. Automatically fix search_path for all public schema functions flagged by Supabase Linter
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f' -- standard functions
          AND NOT (p.proconfig @> ARRAY['search_path=public, pg_temp'] OR p.proconfig @> ARRAY['search_path=public'] OR p.proconfig @> ARRAY['search_path=""'])
    ) LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', f.proname, f.args);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore functions that cannot be altered (e.g. system extensions)
            NULL;
        END;
    END LOOP;
END $$;
