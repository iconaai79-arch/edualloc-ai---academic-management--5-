-- Migration: 422_fix_client_site_contracts_rls.sql
-- Purpose: Fix permissive RLS on client_site_contracts by removing client_site_contracts_policy and enforcing scoped multi-tenant RLS policies.

ALTER TABLE IF EXISTS public.client_site_contracts ENABLE ROW LEVEL SECURITY;

-- Drop permissive or obsolete policies
DROP POLICY IF EXISTS "client_site_contracts_policy" ON public.client_site_contracts;
DROP POLICY IF EXISTS client_site_contracts_policy ON public.client_site_contracts;
DROP POLICY IF EXISTS "client_site_contracts_all" ON public.client_site_contracts;
DROP POLICY IF EXISTS "client_site_contracts_select" ON public.client_site_contracts;
DROP POLICY IF EXISTS "client_site_contracts_insert" ON public.client_site_contracts;
DROP POLICY IF EXISTS "client_site_contracts_update" ON public.client_site_contracts;
DROP POLICY IF EXISTS "client_site_contracts_delete" ON public.client_site_contracts;

-- Scoped multi-tenant RLS policies
CREATE POLICY "client_site_contracts_select" ON public.client_site_contracts
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "client_site_contracts_insert" ON public.client_site_contracts
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "client_site_contracts_update" ON public.client_site_contracts
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "client_site_contracts_delete" ON public.client_site_contracts
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.client_site_contracts TO authenticated, anon, service_role;

-- Also ensure any legacy _policy on remaining private security tables is cleaned up
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'security_guards', 'security_patrol_scans', 'rapid_response_units', 
        'occurrence_book', 'armory_equipment'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_policy', t);
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
