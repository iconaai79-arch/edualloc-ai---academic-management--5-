-- 101_secure_activity_log.sql
-- Security hardening for activity_log table.
-- Replaces insecure "Master Unblock" with targeted, secure policies.

DO $$ 
BEGIN
    -- 1. Ensure RLS is enabled
    ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

    -- 2. Drop the insecure Master Unblock policy
    DROP POLICY IF EXISTS "activity_log_master_unblock_all" ON public.activity_log;
    
    -- 3. Create Secure Targeted Policies
    
    -- A. Global INSERT (Necessary for various actions across the app to be logged)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_insert_all') THEN
        CREATE POLICY "activity_log_insert_all" 
        ON public.activity_log FOR INSERT 
        WITH CHECK (true);
    END IF;

    -- B. Super Admin SELECT (Full visibility)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_super_admin_select') THEN
        CREATE POLICY "activity_log_super_admin_select" 
        ON public.activity_log FOR SELECT 
        USING (public.get_curr_user_role() = 'super_admin');
    END IF;

    -- C. Institutional Admin SELECT (Visibility of their own institution)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_institutional_select') THEN
        CREATE POLICY "activity_log_institutional_select" 
        ON public.activity_log FOR SELECT 
        USING (
            institution_id = public.get_curr_user_inst_id()
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'hod', 'registrar', 'county_admin')
        );
    END IF;

    -- D. Individual User SELECT (Visibility of their own logs)
    -- Handles both raw UUID and u_ prefix for user_id
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_individual_select') THEN
        CREATE POLICY "activity_log_individual_select" 
        ON public.activity_log FOR SELECT 
        USING (user_id = auth.uid()::text OR user_id = 'u_' || auth.uid()::text);
    END IF;

    -- 4. Grant necessary permissions
    GRANT INSERT, SELECT ON public.activity_log TO anon, authenticated;
    
    RAISE NOTICE 'Secured activity_log: Replaced master unblock with targeted institutional and individual policies.';
END $$;
