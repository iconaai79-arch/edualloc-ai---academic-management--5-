-- 056_activity_log_rls_fix.sql
-- Explicitly enables RLS for activity_log and applies secure policies.

-- 1. Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions
GRANT ALL ON public.activity_log TO anon, authenticated, service_role;

-- 3. Drop all potentially conflicting policies
DROP POLICY IF EXISTS "activity_log_tenancy_select" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_tenancy_manage" ON public.activity_log;
DROP POLICY IF EXISTS "Institutional tenancy select: activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Institutional tenancy manage: activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "User activity log view" ON public.activity_log;

-- 4. SELECT Policy: Super Admin OR Own Log OR Admin in same institution
CREATE POLICY "activity_log_read_policy"
    ON public.activity_log
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text)
        OR (
            public.get_curr_user_role() IN ('admin', 'head_teacher')
            AND institution_id::text = public.get_curr_user_inst_id()
        )
    );

-- 5. ALL (Manage) Policy: Only Super Admin and System (Regular users don't manually edit logs)
CREATE POLICY "activity_log_manage_policy"
    ON public.activity_log
    FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');

DO $$ BEGIN
    RAISE NOTICE 'RLS enabled and hardened for activity_log.';
END $$;
