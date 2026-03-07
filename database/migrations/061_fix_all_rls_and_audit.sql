-- 061_fix_all_rls_and_audit.sql
-- Definitive fix for RLS functions and permissions for activity_log and academic_levels.

-- 1. HARDEN CORE RLS FUNCTIONS
-- These functions are the backbone of all RLS policies. If they fail, data stops loading.
CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Try to find the user by their Auth ID (handling potential 'u_' prefix)
    SELECT role INTO v_role FROM public.users 
    WHERE id = auth.uid()::text 
       OR id = 'u_' || auth.uid()::text 
    LIMIT 1;
    
    -- Emergency Bootstrap for Super Admin (ensures access even if user record is missing)
    IF v_role IS NULL AND auth.jwt() ->> 'email' = 'super@app.com' THEN
        RETURN 'super_admin';
    END IF;
    
    RETURN COALESCE(v_role, 'anon');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
    v_inst_id TEXT;
BEGIN
    SELECT institution_id INTO v_inst_id FROM public.users 
    WHERE id = auth.uid()::text 
       OR id = 'u_' || auth.uid()::text 
    LIMIT 1;
    
    RETURN v_inst_id;
END;
$$;

-- 2. FIX ACTIVITY LOG PERMISSIONS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid name conflicts or overlapping logic
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'activity_log' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_log', pol.policyname);
    END LOOP;
END $$;

-- Policy: Super Admins can see EVERYTHING
CREATE POLICY "activity_log_super_admin_all" 
ON public.activity_log FOR ALL 
USING (public.get_curr_user_role() = 'super_admin');

-- Policy: Institutional users can see their own logs
CREATE POLICY "activity_log_institutional_select" 
ON public.activity_log FOR SELECT 
USING (institution_id = public.get_curr_user_inst_id());

-- Policy: Users can see their own individual logs
CREATE POLICY "activity_log_individual_select" 
ON public.activity_log FOR SELECT 
USING (user_id = auth.uid()::text OR user_id = 'u_' || auth.uid()::text);

-- Policy: Anyone logged in can create logs (Critical for handleLogAction to work)
CREATE POLICY "activity_log_insert_all" 
ON public.activity_log FOR INSERT 
WITH CHECK (true);

-- 3. FIX ACADEMIC LEVELS PERMISSIONS
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for academic_levels
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'academic_levels' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.academic_levels', pol.policyname);
    END LOOP;
END $$;

-- Policy: Super Admins manage all
CREATE POLICY "academic_levels_super_admin" 
ON public.academic_levels FOR ALL 
USING (public.get_curr_user_role() = 'super_admin');

-- Policy: Institutional users view their levels
CREATE POLICY "academic_levels_institutional_select" 
ON public.academic_levels FOR SELECT 
USING (institution_id = public.get_curr_user_inst_id());

-- Policy: Institutional admins manage their levels
CREATE POLICY "academic_levels_institutional_manage" 
ON public.academic_levels FOR ALL 
USING (
    institution_id = public.get_curr_user_inst_id() 
    AND public.get_curr_user_role() IN ('admin', 'head_teacher')
);

-- 4. VERIFY CONNECTION
-- This notice will appear in the Supabase SQL editor output
DO $$ BEGIN
    RAISE NOTICE 'RLS Fixes Applied: get_curr_user_role, activity_log, academic_levels';
END $$;
