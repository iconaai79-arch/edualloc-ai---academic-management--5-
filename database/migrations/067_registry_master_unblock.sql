-- 067_registry_master_unblock.sql
-- Broadly unblock Registry-related tables for the anon role 
-- following the established "Master Unblock" strategy.

DO $$ 
DECLARE 
    t_name TEXT;
    tables_to_unblock TEXT[] := ARRAY[
        'allocation_requests',
        'absence_requests',
        'time_off_requests',
        'contracts',
        'subjects',
        'courses',
        'departments',
        'academic_levels',
        'academic_years',
        'semesters',
        'rooms',
        'buildings',
        'enrollment_requests',
        'student_absence_requests'
    ];
BEGIN 
    FOREACH t_name IN ARRAY tables_to_unblock LOOP
        -- Enable RLS just in case it wasn't
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            EXECUTE 'ALTER TABLE public.' || quote_ident(t_name) || ' ENABLE ROW LEVEL SECURITY';
            
            -- Drop any existing restrictive policies
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(t_name || '_master_unblock') || ' ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(t_name || '_anon_full_access') || ' ON public.' || quote_ident(t_name);
            
            -- Create the Master Unblock policy
            EXECUTE 'CREATE POLICY ' || quote_ident(t_name || '_master_unblock') || ' ON public.' || quote_ident(t_name) || ' FOR ALL USING (true) WITH CHECK (true)';
            
            -- Grant broad permissions
            EXECUTE 'GRANT ALL ON public.' || quote_ident(t_name) || ' TO anon, authenticated, service_role';
        END IF;
    END LOOP;
END $$;

-- Verify
DO $$ BEGIN
    RAISE NOTICE 'Registry Unblock Applied';
END $$;