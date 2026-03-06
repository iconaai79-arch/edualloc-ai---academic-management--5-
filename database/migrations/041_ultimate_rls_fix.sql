-- Migration 041: Ultimate RLS Fixing (v6 - Master Unblock with Cascade)
-- This migration addresses widespread RLS failures by applying permissive policies for the 'anon' role.
-- It uses CASCADE to clear dependent policies before recreating them.

-- 1. DROP EXISTING FUNCTIONS (Using CASCADE to clear dependent policies)
-- This is necessary because the return types have changed between versions.
DROP FUNCTION IF EXISTS public.get_curr_user_inst_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_curr_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.rls_debug_info() CASCADE;

-- 2. Helper functions (Maintained for future architectural alignment)
CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT institution_id 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

-- 3. Debugging function
CREATE OR REPLACE FUNCTION public.rls_debug_info()
RETURNS TABLE(auth_uid TEXT, inst_id TEXT, user_role TEXT) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT auth.uid()::text, public.get_curr_user_inst_id(), public.get_curr_user_role();
END;
$$;

-- 4. MASTER UNBLOCK LOOP
DO $$
DECLARE
    t_name TEXT;
    policy_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
            table_name LIKE 'carwash_%' OR 
            table_name LIKE 'retail_%' OR 
            table_name LIKE 'cafe_%' OR 
            table_name LIKE 'pm_%' OR
            table_name LIKE 'agrovet_%' OR
            table_name IN ('users', 'institutions', 'requisitions', 'appointments', 'feedback_submissions', 'invoices', 'receipts')
        )
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        
        -- Grant ALL permissions to all roles
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t_name);
        
        -- Drop ALL existing policies for the table (including those left after CASCADE)
        FOR policy_name IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t_name);
        END LOOP;
        
        -- Create a single MASTER PERMISSIVE POLICY for the table
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)', 
                       'master_unblock_' || t_name, t_name);
        
        RAISE NOTICE 'SUCCESS: Unblocked table %', t_name;
    END LOOP;
END $$;

-- 5. Global Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
