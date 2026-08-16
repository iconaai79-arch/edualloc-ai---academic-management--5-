-- ==============================================================================
-- Migration: 340_fix_all_functions_search_path.sql
-- Description: Fix role mutable search_path warning on public.get_next_document_number,
--              public.safe_delete_records, and ALL custom functions in public schema.
-- ==============================================================================

-- 1. Specifically secure public.get_next_document_number and public.safe_delete_records
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN ('get_next_document_number', 'safe_delete_records')
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE 'Fixed search_path for public.%(%)', r.proname, r.args;
    END LOOP;
END $$;

-- 2. Automatically fix search_path for ALL public schema functions without an explicit search_path
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
          AND (
            p.proconfig IS NULL
            OR NOT (
              p.proconfig @> ARRAY['search_path=public, pg_temp']
              OR p.proconfig @> ARRAY['search_path=public']
              OR p.proconfig @> ARRAY['search_path=""']
            )
          )
    ) LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', f.proname, f.args);
            RAISE NOTICE 'Secured function public.%(%) with SET search_path = public, pg_temp', f.proname, f.args;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore functions that cannot be altered (e.g. extension/internal functions)
            NULL;
        END;
    END LOOP;
END $$;
