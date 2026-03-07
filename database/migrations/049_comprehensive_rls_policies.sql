-- 049_comprehensive_rls_policies.sql
-- Comprehensive Row Level Security Implementation
-- This migration replaces permissive "master unblock" policies with secure institutional and ownership-based rules.

-- ==========================================================================
-- PHASE 1: ACTIVATION & CLEANUP
-- ==========================================================================

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
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        
        -- Grant ALL permissions to all roles (Backend managed auth)
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t_name);
        
        -- Remove permissive policies if they exist from previous migrations
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'master_unblock_' || t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Permissive policy for ' || t_name, t_name);
    END LOOP;
END $$;

-- ==========================================================================
-- PHASE 2: GLOBAL POLICIES (INSTITUTIONS & COUNTIES)
-- ==========================================================================

-- Institutions: Super Admins view all; Admins/Staff view their own
DROP POLICY IF EXISTS "Institutions visibility" ON public.institutions;
CREATE POLICY "Institutions visibility"
    ON public.institutions
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin') 
        OR (id = public.get_curr_user_inst_id())
    );

-- Counties: Publicly readable for registration/discovery; Managed by Super Admin
DROP POLICY IF EXISTS "Counties accessibility" ON public.counties;
CREATE POLICY "Counties accessibility"
    ON public.counties
    FOR SELECT
    USING (true);

CREATE POLICY "Super Admins manage counties"
    ON public.counties
    FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');

-- ==========================================================================
-- PHASE 3: INSTITUTIONAL TENANCY (THE GOLDEN RULE)
-- These tables MUST be filtered by institution_id
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
        AND c.table_name NOT IN ('users', 'institutions', 'attendance_logs') -- Handled specifically elsewhere or highly sensitive
    LOOP
        -- Drop if exists
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy select: ' || t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Institutional tenancy manage: ' || t_name, t_name);

        -- SELECT Policy: Teammates read (Students, Teachers, Admins)
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (institution_id::text = public.get_curr_user_inst_id())', 
                       'Institutional tenancy select: ' || t_name, t_name);

        -- ALL Policy: Admins/Managers manage within institution
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
                           institution_id::text = public.get_curr_user_inst_id() 
                           AND public.get_curr_user_role() IN (''admin'', ''super_admin'', ''head_teacher'', ''carwash_admin'', ''agrovet_admin'', ''property_admin'', ''transport_admin'')
                       )', 
                       'Institutional tenancy manage: ' || t_name, t_name);
    END LOOP;
END $$;

-- ==========================================================================
-- PHASE 4: RECORD OWNERSHIP (USER DATA)
-- These tables are primary to the user who created them
-- ==========================================================================

-- Tasks
DROP POLICY IF EXISTS "User personal tasks" ON public.tasks;
CREATE POLICY "User personal tasks"
    ON public.tasks
    FOR ALL
    USING (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text);

-- Activity Log
DROP POLICY IF EXISTS "User activity log view" ON public.activity_log;
CREATE POLICY "User activity log view"
    ON public.activity_log
    FOR SELECT
    USING (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text);

-- Feedback Submissions
DROP POLICY IF EXISTS "Feedback visibility" ON public.feedback_submissions;
CREATE POLICY "Feedback visibility"
    ON public.feedback_submissions
    FOR SELECT
    USING (
         (student_id::text = auth.uid()::text OR student_id::text = 'u_' || auth.uid()::text)
         OR (public.get_curr_user_role() IN ('admin', 'super_admin', 'head_teacher') AND institution_id::text = public.get_curr_user_inst_id())
    );

-- ==========================================================================
-- PHASE 5: SENSITIVE DATA MASKS
-- ==========================================================================

-- System Settings: Only Super Admin
DROP POLICY IF EXISTS "System settings restricted" ON public.system_settings;
CREATE POLICY "System settings restricted"
    ON public.system_settings
    FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');

-- M-Pesa Transactions: Admins only
DROP POLICY IF EXISTS "Financial records visibility" ON public.mpesa_transactions;
CREATE POLICY "Financial records visibility"
    ON public.mpesa_transactions
    FOR SELECT
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        AND public.get_curr_user_role() IN ('admin', 'super_admin', 'reseller', 'billing_officer')
    );

-- ==========================================================================
-- PHASE 6: TEACHER & STAFF OPS
-- ==========================================================================

-- Teacher Check-ins
DROP POLICY IF EXISTS "Teacher check-ins privacy" ON public.teacher_checkins;
CREATE POLICY "Teacher check-ins privacy"
    ON public.teacher_checkins
    FOR ALL
    USING (
        (teacher_id::text = auth.uid()::text OR teacher_id::text = 'u_' || auth.uid()::text)
        OR (public.get_curr_user_role() IN ('admin', 'head_teacher', 'super_admin') AND institution_id::text = public.get_curr_user_inst_id())
    );

-- Security Alerts
DROP POLICY IF EXISTS "Security alerts visibility" ON public.security_alerts;
CREATE POLICY "Security alerts visibility"
    ON public.security_alerts
    FOR SELECT
    USING (institution_id::text = public.get_curr_user_inst_id());

-- ==========================================================================
-- FINAL AUDIT NOTICE
-- ==========================================================================
DO $$ BEGIN
    RAISE NOTICE 'Comprehensive RLS Policies applied successfully to all detected modules.';
END $$;

