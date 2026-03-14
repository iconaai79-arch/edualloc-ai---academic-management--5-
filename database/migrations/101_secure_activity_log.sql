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
    
    -- A. Authenticated INSERT (User can only log for themselves)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_insert_authenticated') THEN
        CREATE POLICY "activity_log_insert_authenticated" 
        ON public.activity_log FOR INSERT 
        TO authenticated
        WITH CHECK (
            user_id = auth.uid()::text 
            OR user_id = 'u_' || auth.uid()::text
            OR (public.get_curr_user_role() = 'super_admin')
        );
    END IF;

    -- B. Anon INSERT (Only for non-logged-in actions, limited to anonymous user_id)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_insert_anon') THEN
        CREATE POLICY "activity_log_insert_anon" 
        ON public.activity_log FOR INSERT 
        TO anon
        WITH CHECK (
            user_id IS NULL 
            OR user_id = 'anonymous'
            OR user_id = 'system'
        );
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
