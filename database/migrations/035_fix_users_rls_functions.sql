
-- 1. SECURITY DEFINER functions to break recursion
-- These bypass RLS during the lookup, which is necessary to avoid "infinite recursion"
CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT institution_id FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1);
    
    -- Bootstrap Super Admin (Safe fallback if profile not yet created)
    IF v_role IS NULL AND auth.jwt() ->> 'email' = 'super@app.com' THEN
        RETURN 'super_admin';
    END IF;
    
    RETURN v_role;
END;
$$;

-- 2. Drop all conflicting policies
DROP POLICY IF EXISTS "Users can view themselves" ON public.users;
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
DROP POLICY IF EXISTS "Admins can manage teammates" ON public.users;
DROP POLICY IF EXISTS "Super Admins can manage all" ON public.users;
DROP POLICY IF EXISTS "Users can manage themselves" ON public.users;

-- 3. Base Policy: Users can see/edit their own record (Login requires this)
-- This is non-recursive because it doesn't query the users table
CREATE POLICY "Users can manage themselves"
ON public.users FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Teammate Visibility (Uses function to avoid recursion)
CREATE POLICY "Users can view teammates"
ON public.users FOR SELECT
USING (institution_id = get_curr_user_inst_id());

-- 5. Institutional Admin Management
CREATE POLICY "Admins can manage teammates"
ON public.users FOR ALL
USING (
    institution_id = get_curr_user_inst_id()
    AND get_curr_user_role() IN ('admin', 'head_teacher', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin')
)
WITH CHECK (
    institution_id = get_curr_user_inst_id()
    AND get_curr_user_role() IN ('admin', 'head_teacher', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin')
);

-- 6. Super Admin Override
CREATE POLICY "Super Admins can manage all"
ON public.users FOR ALL
USING (get_curr_user_role() = 'super_admin')
WITH CHECK (get_curr_user_role() = 'super_admin');

-- 7. Anonymous Read (CRITICAL for client-side login)
-- The application fetches users to perform client-side matching.
-- Without this, no user can log in because they can't be found in the first place.
CREATE POLICY "Allow anonymous read for login"
ON public.users FOR SELECT
TO anon
USING (true);
