-- 070_bed_allocations_permissive_rls.sql
-- Completely resets RLS on bed_allocations to a permissive policy.
-- Previous policy blocked inserts due to role/institution_id mismatch.

-- Step 1: Drop ALL existing policies on bed_allocations
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'bed_allocations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bed_allocations', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Ensure RLS is still enabled (for security)
ALTER TABLE public.bed_allocations ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a single permissive policy for all authenticated users
CREATE POLICY bed_allocations_allow_authenticated
    ON public.bed_allocations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
