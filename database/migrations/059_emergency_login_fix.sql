-- 059_emergency_login_fix.sql
-- RESTORES LOGIN ACCESS by reverting helper functions and ensuring public read for login tables.

-- 1. Restore get_curr_user_role to STABLE version (returns NULL if not found)
CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

-- 2. Restore get_curr_user_inst_id to STABLE version (returns NULL if not found)
CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT institution_id 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

-- 3. Ensure USERS and INSTITUTIONS are readable by anon (IMPORTANT for login)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read for login" ON public.users;
CREATE POLICY "Allow anonymous read for login"
    ON public.users FOR SELECT
    TO anon, authenticated
    USING (true);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read: institutions" ON public.institutions;
CREATE POLICY "Allow anonymous read: institutions"
    ON public.institutions FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. Grant explicit permissions to anon role
GRANT SELECT ON public.users TO anon, authenticated;
GRANT SELECT ON public.institutions TO anon, authenticated;

DO $$ BEGIN
    RAISE NOTICE 'Login access restored: Helpers reverted and public tables unblocked.';
END $$;
