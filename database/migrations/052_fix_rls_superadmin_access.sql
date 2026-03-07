-- 052_fix_rls_superadmin_access.sql
-- Hardens RLS helper functions and ensures Super Admins can bypass institutional tenancy.

-- 1. Redefine helper functions with better robustness and Super Admin bootstrap
CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- 1. Try to get role from users table (handle both raw UUID and u_ prefix)
    SELECT role INTO v_role 
    FROM public.users 
    WHERE id = auth.uid()::text 
       OR id = 'u_' || auth.uid()::text 
    LIMIT 1;
    
    -- 2. Bootstrap Super Admin if no record exists yet (for first login)
    IF v_role IS NULL AND auth.jwt() ->> 'email' = 'super@app.com' THEN
        RETURN 'super_admin';
    END IF;
    
    RETURN COALESCE(v_role, 'anon');
END;
$$;

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

-- 2. Update specific policies to allow Super Admin access
-- Academic Levels
DROP POLICY IF EXISTS "academic_levels_tenancy_select" ON public.academic_levels;
CREATE POLICY "academic_levels_tenancy_select"
    ON public.academic_levels
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin') 
        OR (institution_id::text = public.get_curr_user_inst_id())
    );

-- Academic Years
DROP POLICY IF EXISTS "academic_years_tenancy_select" ON public.academic_years;
CREATE POLICY "academic_years_tenancy_select"
    ON public.academic_years
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin') 
        OR (institution_id::text = public.get_curr_user_inst_id())
    );

-- 3. Update the global Institutional Tenancy policies for all other tables
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
        -- Re-apply SELECT Policy with Super Admin override
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy select: ' || t_name, t_name);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (
                           (public.get_curr_user_role() = ''super_admin'') 
                           OR (institution_id::text = public.get_curr_user_inst_id())
                       )', 
                       'Institutional tenancy select: ' || t_name, t_name);
    END LOOP;
END $$;
