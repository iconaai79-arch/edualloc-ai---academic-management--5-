-- Migration 527: Fix role mutable search_path on public.bulk_assign_ds_students_branch
-- Purpose: Resolves Supabase Security Advisor warning: "Function public.bulk_assign_ds_students_branch has a role mutable search_path"
-- Linter Rule: function_search_path_mutable (Supabase Security Advisory)

-- 1. Specifically lock search_path for all overloads of public.bulk_assign_ds_students_branch
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname = 'bulk_assign_ds_students_branch'
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE 'Secured function public.%(%) with SET search_path = public, pg_temp', r.proname, r.args;
    END LOOP;
END $$;

-- 2. Direct static ALTER to ensure explicit resolution
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'bulk_assign_ds_students_branch'
    ) THEN
        ALTER FUNCTION public.bulk_assign_ds_students_branch(TEXT[], TEXT, TEXT) SET search_path = public, pg_temp;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Comprehensive sweep: lock search_path for any remaining unsecured public functions
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND p.prosecdef = true -- SECURITY DEFINER functions
          AND (
            p.proconfig IS NULL
            OR NOT (
              array_to_string(p.proconfig, ',') LIKE '%search_path=%'
            )
          )
    ) LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', f.proname, f.args);
            RAISE NOTICE 'Secured function public.%(%) with SET search_path = public, pg_temp', f.proname, f.args;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
