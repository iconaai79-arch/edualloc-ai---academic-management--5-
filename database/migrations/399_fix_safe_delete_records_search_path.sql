-- ==============================================================================
-- Migration: 399_fix_safe_delete_records_search_path.sql
-- Description: Explicitly sets fixed search_path = public, pg_temp on
--              public.safe_delete_records to resolve Supabase linter warning:
--              "Function public.safe_delete_records has a role mutable search_path"
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname = 'safe_delete_records'
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE 'Fixed role mutable search_path on public.%(%)', r.proname, r.args;
    END LOOP;
END $$;
