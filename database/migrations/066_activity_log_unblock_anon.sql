-- 066_activity_log_unblock_anon.sql
-- Master Unblock for activity_log to allow anon and authenticated roles.
-- This ensures that logs can be created even when the user is operating under the anon role.

-- 1. Ensure RLS is enabled
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies for activity_log to avoid conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'activity_log' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_log', pol.policyname);
    END LOOP;
END $$;

-- 3. Create Master Unblock Policies
-- Allows everyone (anon, authenticated, service_role) to read, insert, etc.
-- Control is handled at the application layer.

CREATE POLICY "activity_log_master_unblock_all"
ON public.activity_log
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Grant full permissions to ensure roles can actually execute commands
GRANT ALL ON public.activity_log TO anon, authenticated, service_role;

-- Verification notice
DO $$ BEGIN
    RAISE NOTICE 'Activity Log Master Unblock Applied: anon and authenticated roles now have full access.';
END $$;
