-- ==============================================================================
-- Migration: 459_fix_function_search_path_clean_grade.sql
-- Description: Fix role mutable search_path warning on public.fn_extract_clean_grade,
--              public.fn_extract_clean_stream, and all public functions in Supabase.
-- Linter Rule: function_search_path_mutable (Supabase Security Advisory)
-- ==============================================================================

-- 1. Specifically secure public.fn_extract_clean_grade and related helper functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN (
              'fn_extract_clean_grade',
              'fn_extract_clean_stream',
              'fn_is_synthetic_adm',
              'fn_student_real_adm',
              'fn_student_real_grade',
              'fn_student_real_stream'
          )
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE 'Secured function public.%(%) with SET search_path = public, pg_temp', r.proname, r.args;
    END LOOP;
END $$;

-- 2. Comprehensive security pass: automatically set search_path = public, pg_temp
--    for any standard function in public schema that does not have an explicit search_path
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
            -- Ignore functions that cannot be altered (e.g. extension internal functions)
            NULL;
        END;
    END LOOP;
END $$;
