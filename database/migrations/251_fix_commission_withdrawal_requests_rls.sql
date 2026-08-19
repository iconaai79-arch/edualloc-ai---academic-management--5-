-- Migration: Fix Permissive RLS on commission_withdrawal_requests
-- Description: Replaces unrestricted FOR ALL policies with granular RLS policies.

ALTER TABLE public.commission_withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_withdrawal_requests_all_access" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_select" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_insert" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_update" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_delete" ON public.commission_withdrawal_requests;

CREATE POLICY "commission_withdrawal_requests_select" ON public.commission_withdrawal_requests
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "commission_withdrawal_requests_insert" ON public.commission_withdrawal_requests
    FOR INSERT TO authenticated, anon
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "commission_withdrawal_requests_update" ON public.commission_withdrawal_requests
    FOR UPDATE TO authenticated, anon
    USING (auth.role() IN ('authenticated', 'anon') OR public.get_curr_user_role()::text = 'super_admin')
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "commission_withdrawal_requests_delete" ON public.commission_withdrawal_requests
    FOR DELETE TO authenticated
    USING (auth.role() = 'authenticated' OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.commission_withdrawal_requests TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
