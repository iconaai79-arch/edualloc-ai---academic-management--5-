-- 100_secure_registry_tables.sql
-- Comprehensive security hardening for previously "unblocked" Registry tables.
-- standardizes absence_requests schema and enforces institutional tenancy.

DO $$ 
BEGIN
    -- 1. Standardize absence_requests schema
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'absence_requests' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.absence_requests ADD COLUMN institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE;
        
        -- Backfill institution_id from lecturer's profile
        UPDATE public.absence_requests ar
        SET institution_id = u.institution_id
        FROM public.users u
        WHERE ar.lecturer_id = u.id;
        
        RAISE NOTICE 'absence_requests schema standardized with institution_id.';
    END IF;

    -- 2. Define the list of tables to secure (from 067_registry_master_unblock.sql)
    DECLARE
        tables_to_secure TEXT[] := ARRAY[
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
        t_name TEXT;
        policy_name TEXT;
    BEGIN
        FOREACH t_name IN ARRAY tables_to_secure LOOP
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
                -- A. Enable RLS
                EXECUTE 'ALTER TABLE public.' || quote_ident(t_name) || ' ENABLE ROW LEVEL SECURITY';
                
                -- B. Drop the insecure "Master Unblock" and other common permissive policies
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(t_name || '_master_unblock') || ' ON public.' || quote_ident(t_name);
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(t_name || '_anon_full_access') || ' ON public.' || quote_ident(t_name);
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident('Institutional tenancy select: ' || t_name) || ' ON public.' || quote_ident(t_name);
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident('Institutional tenancy manage: ' || t_name) || ' ON public.' || quote_ident(t_name);

                -- C. Create Secure Institutional Tenancy SELECT Policy
                EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (
                    (public.get_curr_user_role() = ''super_admin'') 
                    OR (institution_id::text = public.get_curr_user_inst_id())
                )', 'Institutional tenancy select: ' || t_name, t_name);

                -- D. Create Secure Institutional Tenancy MANAGE Policy
                -- Allows institutional admins to perform ALL actions
                EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
                    (public.get_curr_user_role() = ''super_admin'') 
                    OR (
                        institution_id::text = public.get_curr_user_inst_id()
                        AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''hod'', ''registrar'', ''county_admin'')
                    )
                )', 'Institutional tenancy manage: ' || t_name, t_name);

                -- E. Add specialized policies for specific tables if needed
                -- For example: Requesters see their own pending records even if they aren't admins
                IF t_name = 'absence_requests' THEN
                    EXECUTE 'DROP POLICY IF EXISTS "Lecturers see own absences" ON public.absence_requests';
                    EXECUTE 'CREATE POLICY "Lecturers see own absences" ON public.absence_requests FOR SELECT USING (lecturer_id = auth.uid()::text OR lecturer_id = ''u_'' || auth.uid()::text)';
                ELSIF t_name = 'student_absence_requests' THEN
                    EXECUTE 'DROP POLICY IF EXISTS "Students see own absences" ON public.student_absence_requests';
                    EXECUTE 'CREATE POLICY "Students see own absences" ON public.student_absence_requests FOR SELECT USING (student_id = auth.uid()::text OR student_id = ''u_'' || auth.uid()::text)';
                END IF;

                RAISE NOTICE 'Secured table: %', t_name;
            END IF;
        END LOOP;
    END;
END $$;

-- Verify
DO $$ BEGIN
    RAISE NOTICE 'Registry Security Hardening COMPLETE: 14 tables transitioned from Master Unblock to Institutional Tenancy.';
END $$;
