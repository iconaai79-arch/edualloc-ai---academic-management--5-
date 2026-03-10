-- 085_fix_retail_agency_rls.sql
-- Fixes RLS policies to allow Retail Agents and Admins to save institution settings (like location).

-- 1. Institutions Table: Add UPDATE policy
-- Previous migrations only had SELECT. We need UPDATE for authorized roles.
DROP POLICY IF EXISTS "Institutions update" ON public.institutions;
CREATE POLICY "Institutions update"
    ON public.institutions
    FOR UPDATE
    USING (
        (public.get_curr_user_role() = 'super_admin') 
        OR (
            id = public.get_curr_user_inst_id() 
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'carwash_admin', 'agrovet_admin', 'property_admin', 'transport_admin')
        )
    )
    WITH CHECK (
        (public.get_curr_user_role() = 'super_admin') 
        OR (
            id = public.get_curr_user_inst_id() 
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'carwash_admin', 'agrovet_admin', 'property_admin', 'transport_admin')
        )
    );

-- 2. Update Institutional Tenancy Management for all tables
-- This adds 'retail_agent' to the authorized management roles for institutional data.
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT c.table_name 
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.column_name = 'institution_id' 
        AND c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT IN ('users', 'institutions', 'attendance_logs')
    LOOP
        -- Drop old 'Institutional tenancy manage' policy if it exists (from 049 or 053)
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy manage: ' || t_name, t_name);

        -- Create NEW ALL (Manage) Policy including retail_agent
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
                           (public.get_curr_user_role() = ''super_admin'') 
                           OR (
                               institution_id::text = public.get_curr_user_inst_id() 
                               AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''retail_agent'', ''carwash_admin'', ''agrovet_admin'', ''property_admin'', ''transport_admin'', ''boarding_master'', ''county_admin'')
                           )
                       )', 
                       'Institutional tenancy manage: ' || t_name, t_name);
    END LOOP;
END $$;

-- 3. Users Table: Update management policy to include retail_agent
DROP POLICY IF EXISTS "Admins can manage teammates" ON public.users;
CREATE POLICY "Admins can manage teammates"
ON public.users FOR ALL
USING (
    institution_id = public.get_curr_user_inst_id()
    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin')
)
WITH CHECK (
    institution_id = public.get_curr_user_inst_id()
    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin')
);

-- 4. Registry-specific tables update (if they were unblocked in 067)
-- This ensures 'retail_agent' can also manage these if they are relevant (e.g., departments, buildings)
DO $$ 
DECLARE 
    t_name TEXT;
    tables_to_unblock TEXT[] := ARRAY[
        'departments',
        'buildings',
        'rooms'
    ];
BEGIN 
    FOREACH t_name IN ARRAY tables_to_unblock LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy manage: ' || t_name, t_name);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
                               (public.get_curr_user_role() = ''super_admin'') 
                               OR (
                                   institution_id::text = public.get_curr_user_inst_id() 
                                   AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''retail_agent'', ''carwash_admin'', ''agrovet_admin'', ''property_admin'', ''transport_admin'', ''boarding_master'', ''county_admin'')
                               )
                           )', 
                           'Institutional tenancy manage: ' || t_name, t_name);
        END IF;
    END LOOP;
END $$;

-- Verify
DO $$ BEGIN
    RAISE NOTICE 'Retail Agency RLS Fixes Applied';
END $$;
