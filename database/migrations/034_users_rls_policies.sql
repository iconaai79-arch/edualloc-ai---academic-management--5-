
-- Users Table RLS Policies
-- Ensures users can only see relevant data and admins can manage their institution's users.

-- 1. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Users can view themselves" ON public.users;
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
DROP POLICY IF EXISTS "Admins can manage teammates" ON public.users;
DROP POLICY IF EXISTS "Super Admins can manage all" ON public.users;

-- 3. SELECT: Users can view their own profile
CREATE POLICY "Users can view themselves"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- 4. SELECT: Users can view others within the SAME institution
-- Note: This subquery on the same table is handled by PostgreSQL without infinite recursion 
-- when filtered by auth.uid().
CREATE POLICY "Users can view teammates"
    ON public.users
    FOR SELECT
    USING (
        institution_id = (
            SELECT u.institution_id 
            FROM public.users u 
            WHERE u.id = auth.uid() 
            LIMIT 1
        )
    );

-- 5. ALL: Institutional Admins can manage users in their specific institution
CREATE POLICY "Admins can manage teammates"
    ON public.users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users admin_user
            WHERE admin_user.id = auth.uid()
            AND admin_user.role IN ('admin', 'head_teacher', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin')
            AND admin_user.institution_id = public.users.institution_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.users admin_user
            WHERE admin_user.id = auth.uid()
            AND admin_user.role IN ('admin', 'head_teacher', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin')
            AND admin_user.institution_id = public.users.institution_id
        )
    );

-- 6. ALL: Super Admins bypass all institutional restrictions
CREATE POLICY "Super Admins can manage all"
    ON public.users
    FOR ALL
    USING (
        (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'super_admin'
    )
    WITH CHECK (
        (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'super_admin'
    );
