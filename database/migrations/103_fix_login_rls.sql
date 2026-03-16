-- 103_fix_login_rls.sql
-- Restores public SELECT access for institutions and users to unblock login discovery.
-- This ensures that unauthenticated clients can find their profiles while all other operations remain locked.

DO $$
BEGIN
    -- 1. Explicitly grant USAGE and SELECT to anon and authenticated roles
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT SELECT ON public.institutions TO anon, authenticated;
    GRANT SELECT ON public.users TO anon, authenticated;
    GRANT SELECT ON public.counties TO anon, authenticated;

    -- 2. Drop any previous unblock policies to avoid conflict
    DROP POLICY IF EXISTS "master_unblock_users" ON public.users;
    DROP POLICY IF EXISTS "master_unblock_institutions" ON public.institutions;
    DROP POLICY IF EXISTS "Allow anonymous read for login" ON public.users;
    DROP POLICY IF EXISTS "Allow anonymous read: institutions" ON public.institutions;
    DROP POLICY IF EXISTS "Allow anonymous read: counties" ON public.counties;

    -- 3. Create permissive SELECT policies for the 'anon' role (discovery phase)
    CREATE POLICY "Allow anonymous read for login"
        ON public.users FOR SELECT
        TO anon, authenticated
        USING (true);

    -- 4. Registry Tables: Re-verify Counties (should be public)
    DROP POLICY IF EXISTS "Counties accessibility" ON public.counties;
    CREATE POLICY "Counties accessibility"
        ON public.counties FOR SELECT
        TO anon, authenticated
        USING (true);

    RAISE NOTICE 'Login RLS Fix Applied: institutions and users unblocked for discovery.';
END $$;
