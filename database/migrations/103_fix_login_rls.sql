-- 103_fix_login_rls.sql
-- Restores public SELECT access for institutions and users to unblock login discovery.
-- This ensures that unauthenticated clients can find their profiles while all other operations remain locked.

DO $$ 
BEGIN
    -- 1. Explicitly grant SELECT to anon and authenticated roles
    GRANT SELECT ON public.institutions TO anon, authenticated;
    GRANT SELECT ON public.users TO anon, authenticated;

    -- 2. Institutions: Allow public discovery
    -- Drop existing strict policies if they exist
    DROP POLICY IF EXISTS "Allow anonymous read: institutions" ON public.institutions;
    DROP POLICY IF EXISTS "institutions_anon_read" ON public.institutions;
    
    CREATE POLICY "Allow anonymous read: institutions"
        ON public.institutions FOR SELECT
        TO anon, authenticated
        USING (true);

    -- 3. Users: Allow login registry check
    -- We allow public SELECT but the API proxy handles column filtering
    DROP POLICY IF EXISTS "Allow anonymous read for login" ON public.users;
    DROP POLICY IF EXISTS "users_anon_read" ON public.users;

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
