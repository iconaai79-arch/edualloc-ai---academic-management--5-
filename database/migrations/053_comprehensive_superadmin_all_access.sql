-- 053_comprehensive_superadmin_all_access.sql
-- Fixes management access for Super Admins across all tables.

-- ==========================================================================
-- PHASE 1: RE-APPLY INSTITUTIONAL TENANCY WITH SUPER ADMIN BYPASS
-- ==========================================================================

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
        -- 1. Drop old policies
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy select: ' || t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy manage: ' || t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'academic_levels_tenancy_select', t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'academic_levels_tenancy_manage', t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'academic_years_tenancy_select', t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'academic_years_tenancy_manage', t_name);

        -- 2. Create NEW SELECT Policy: Super Admin sees all; Regular users see their own institution
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (
                           (public.get_curr_user_role() = ''super_admin'') 
                           OR (institution_id::text = public.get_curr_user_inst_id())
                       )', 
                       'Institutional tenancy select: ' || t_name, t_name);

        -- 3. Create NEW ALL (Manage) Policy: Super Admin manages all; Admins manage their own institution
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
                           (public.get_curr_user_role() = ''super_admin'') 
                           OR (
                               institution_id::text = public.get_curr_user_inst_id() 
                               AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''carwash_admin'', ''agrovet_admin'', ''property_admin'', ''transport_admin'', ''boarding_master'', ''county_admin'')
                           )
                       )', 
                       'Institutional tenancy manage: ' || t_name, t_name);
    END LOOP;
END $$;

-- ==========================================================================
-- PHASE 2: FIX SPECIFIC OVERRIDES
-- ==========================================================================

-- Academic Levels (Explicitly ensured)
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_levels_tenancy_select" ON public.academic_levels;
DROP POLICY IF EXISTS "academic_levels_tenancy_manage" ON public.academic_levels;

CREATE POLICY "academic_levels_tenancy_select"
    ON public.academic_levels FOR SELECT
    USING ((public.get_curr_user_role() = 'super_admin') OR (institution_id::text = public.get_curr_user_inst_id()));

CREATE POLICY "academic_levels_tenancy_manage"
    ON public.academic_levels FOR ALL
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (institution_id::text = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher'))
    );

-- Academic Years
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_years_tenancy_select" ON public.academic_years;
DROP POLICY IF EXISTS "academic_years_tenancy_manage" ON public.academic_years;

CREATE POLICY "academic_years_tenancy_select"
    ON public.academic_years FOR SELECT
    USING ((public.get_curr_user_role() = 'super_admin') OR (institution_id::text = public.get_curr_user_inst_id()));

CREATE POLICY "academic_years_tenancy_manage"
    ON public.academic_years FOR ALL
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (institution_id::text = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher'))
    );

-- ==========================================================================
-- PHASE 3: ENSURE USERS TABLE IS BYPASSABLE FOR LOGIN
-- ==========================================================================
DROP POLICY IF EXISTS "Allow anonymous read for login" ON public.users;
CREATE POLICY "Allow anonymous read for login"
    ON public.users FOR SELECT
    TO anon, authenticated
    USING (true);

DO $$ BEGIN
    RAISE NOTICE 'Super Admin Bypass fixed for all institutional tables.';
END $$;

