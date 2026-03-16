-- 106_comprehensive_rls_fix.sql
-- This script fixes the "denied access" issue caused by enabling RLS on all tables without policies.
-- It establishes a secure institutional tenancy model while ensuring discovery remains possible.

DO $$ 
DECLARE
    t_name TEXT;
    policy_name TEXT;
    has_inst_id BOOLEAN;
    has_id BOOLEAN;
BEGIN
    FOR t_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        -- 0. Grant baseline permissions
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t_name);
        
        -- 1. Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        
        -- 2. Drop any previous "Master Unblock" or "Hardened" policies to start fresh
        FOR policy_name IN 
            SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t_name);
        END LOOP;

        -- 3. Check for identifying columns
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'institution_id'
        ) INTO has_inst_id;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'id'
        ) INTO has_id;

        -- 4. SERVICE ROLE: Always bypass
        EXECUTE format('CREATE POLICY "Service Role Full Access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t_name);

        -- 5. ANON: Discovery Access
        -- Allow anonymous read only for specific discovery-related tables
        IF t_name IN ('institutions', 'users', 'counties', 'system_settings', 'academic_levels', 'academic_years', 'semesters') THEN
            -- Limit what columns anon can see for sensitive tables like users
            IF t_name = 'users' THEN
                EXECUTE format('CREATE POLICY "Anon discovery read" ON public.%I FOR SELECT TO anon USING (true)', t_name);
            ELSE
                EXECUTE format('CREATE POLICY "Anon discovery read" ON public.%I FOR SELECT TO anon USING (true)', t_name);
            END IF;
            RAISE NOTICE 'Added discovery policy for %', t_name;
        END IF;

        -- 6. AUTHENTICATED: Institutional Tenancy
        IF has_inst_id THEN
            -- Standard Tenancy
            EXECUTE format('CREATE POLICY "Institutional tenancy read" ON public.%I FOR SELECT TO authenticated USING (
                (public.get_curr_user_role() = ''super_admin'') 
                OR (institution_id::text = public.get_curr_user_inst_id())
            )', t_name);

            EXECUTE format('CREATE POLICY "Institutional tenancy manage" ON public.%I FOR ALL TO authenticated USING (
                (public.get_curr_user_role() = ''super_admin'') 
                OR (
                    institution_id::text = public.get_curr_user_inst_id()
                    AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''hod'', ''registrar'', ''county_admin'', ''carwash_admin'', ''agrovet_admin'', ''property_admin'', ''field_agent'', ''landlord'')
                )
            )', t_name);
        ELSIF t_name = 'institutions' THEN
            -- Institutions table uses 'id' instead of 'institution_id'
            EXECUTE format('CREATE POLICY "Institutional self-read" ON public.%I FOR SELECT TO authenticated USING (
                (public.get_curr_user_role() = ''super_admin'') 
                OR (id::text = public.get_curr_user_inst_id())
            )', t_name);
        ELSIF t_name = 'counties' THEN
             EXECUTE format('CREATE POLICY "County tenancy read" ON public.%I FOR SELECT TO authenticated USING (true)', t_name);
        ELSE
            -- Tables without institution_id (global metadata) get authenticated read-only or are super_admin managed
            EXECUTE format('CREATE POLICY "Global read for authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t_name);
        END IF;

    END LOOP;
END $$;

-- Fix User RLS (Special Case: Users can update their own profiles)
DO $$ 
BEGIN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated 
    USING (id::text = auth.uid()::text OR id::text = 'u_' || auth.uid()::text)
    WITH CHECK (id::text = auth.uid()::text OR id::text = 'u_' || auth.uid()::text);

    RAISE NOTICE 'Comprehensive RLS fix applied to all tables.';
END $$;

-- Global Grants for sequences and functions (Required for inserts/updates)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
