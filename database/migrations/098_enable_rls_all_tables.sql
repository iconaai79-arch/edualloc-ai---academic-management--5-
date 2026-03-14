-- 098_enable_rls_all_tables.sql
-- Global Row Level Security Enablement
-- This migration ensures that RLS is explicitly enabled for ALL relevant tables in the public schema.

DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys') -- Exclude postgis if present
    LOOP
        -- Enable RLS for the table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        
        RAISE NOTICE 'Enabled RLS for table: %', t_name;
    END LOOP;
END $$;
