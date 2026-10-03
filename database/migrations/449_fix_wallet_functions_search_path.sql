-- ==============================================================================
-- Migration: 449_fix_wallet_functions_search_path.sql
-- Description: Fix role mutable search_path warning on public.topup_institution_wallet
--              and all wallet/convenience fee functions in public schema.
-- ==============================================================================

-- 1. Specifically secure the 4 wallet functions
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
              'topup_institution_wallet', 
              'calculate_convenience_fee', 
              'disburse_payout_to_teacher_wallet', 
              'withdraw_teacher_wallet_mpesa'
          )
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE 'Fixed search_path for public.%(%)', r.proname, r.args;
    END LOOP;
END $$;

-- 2. Automatically secure search_path for ALL public schema functions missing an explicit search_path
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
            NULL;
        END;
    END LOOP;
END $$;
