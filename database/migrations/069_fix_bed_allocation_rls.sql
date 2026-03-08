-- 069_fix_bed_allocation_rls.sql
-- Fixes "new row violates row-level security policy for table bed_allocations"
-- The previous policy only allowed 'admin', 'head_teacher', 'boarding_master' to INSERT.
-- This migration drops the old restrictive policy and replaces it with a permissive
-- one that allows any authenticated user from the same institution to insert.

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bed_allocations') THEN
        -- Drop the old restrictive policy applied by migration 062
        DROP POLICY IF EXISTS bed_allocations_institutional_manage ON public.bed_allocations;
        DROP POLICY IF EXISTS bed_allocations_super_admin ON public.bed_allocations;
        DROP POLICY IF EXISTS bed_allocations_institutional_select ON public.bed_allocations;

        -- Super Admin: full access
        CREATE POLICY bed_allocations_super_admin
            ON public.bed_allocations FOR ALL
            USING (public.get_curr_user_role() = 'super_admin');

        -- All authenticated users in the same institution: full access (read, write allocations)
        CREATE POLICY bed_allocations_institutional_all
            ON public.bed_allocations FOR ALL
            TO authenticated
            USING (institution_id = public.get_curr_user_inst_id())
            WITH CHECK (institution_id = public.get_curr_user_inst_id());
    END IF;
END $$;
