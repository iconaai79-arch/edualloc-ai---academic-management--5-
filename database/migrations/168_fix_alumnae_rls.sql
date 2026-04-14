-- 168_fix_alumnae_rls.sql
-- Tighten RLS policies for alumnae_members to prevent unrestricted INSERT access

-- 1. Fix Public Alumnae Registration
-- Instead of WITH CHECK (true), we ensure new registrations are always 'pending_verification'
DROP POLICY IF EXISTS "Public Alumnae Registration" ON public.alumnae_members;

CREATE POLICY "Public Alumnae Registration" ON public.alumnae_members
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (status = 'pending_verification');

-- 2. Ensure Alumnae Management Policy is robust
DROP POLICY IF EXISTS "Alumnae Management Policy" ON public.alumnae_members;
CREATE POLICY "Alumnae Management Policy" ON public.alumnae_members
    FOR ALL 
    TO authenticated
    USING (
        (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher'))
        OR public.get_curr_user_role() = 'super_admin'
    );
