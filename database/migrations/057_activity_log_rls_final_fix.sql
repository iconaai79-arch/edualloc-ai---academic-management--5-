-- 057_activity_log_rls_final_fix.sql
-- Final hardening of Activity Log security policies.

-- 1. Ensure RLS is enabled
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 2. Drop all previous attempts to start fresh
DROP POLICY IF EXISTS "activity_log_read_policy" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_manage_policy" ON public.activity_log;
DROP POLICY IF EXISTS "Institutional tenancy select: activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Institutional tenancy manage: activity_log" ON public.activity_log;

-- 3. INSERT POLICY: Anyone authenticated can CREATE logs
CREATE POLICY "activity_log_insert_policy"
    ON public.activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. SELECT POLICY: 
--    - Super Admin sees everything
--    - Admins see logs for their institution (handling NULL institution_id by allowing if role matches?) 
--      Actually, let's keep it to same institution for privacy.
--    - Users see their own logs
CREATE POLICY "activity_log_select_policy"
    ON public.activity_log
    FOR SELECT
    TO authenticated
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text)
        OR (
            public.get_curr_user_role() IN ('admin', 'head_teacher', 'carwash_admin', 'agrovet_admin', 'property_admin', 'transport_admin', 'boarding_master', 'county_admin')
            AND (
                institution_id::text = public.get_curr_user_inst_id()
                OR (institution_id IS NULL AND public.get_curr_user_role() = 'super_admin') -- Redundant but safe
            )
        )
    );

-- 5. DELETE/UPDATE POLICY: Only Super Admin
CREATE POLICY "activity_log_delete_update_policy"
    ON public.activity_log
    FOR ALL -- Applies to Update/Delete for those not covered by Insert/Select
    USING (public.get_curr_user_role() = 'super_admin');

DO $$ BEGIN
    RAISE NOTICE 'Activity Log RLS finalized with Insert permissions for all users.';
END $$;
