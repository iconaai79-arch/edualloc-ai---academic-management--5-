-- Migration: 036_fix_constituency_admin_rls.sql
-- Problem: constituency_admin role was missing from the "Admins can manage teammates" 
-- policy, causing user creation to silently fail (RLS rejection).
-- Also adds constituency_staff to allow staff-level operations within their constituency.

-- Drop the old limited policy
DROP POLICY IF EXISTS "Admins can manage teammates" ON public.users;

-- Recreate with constituency_admin and constituency_staff included
CREATE POLICY "Admins can manage teammates"
ON public.users FOR ALL
USING (
    institution_id = get_curr_user_inst_id()
    AND get_curr_user_role() IN (
        'admin', 'head_teacher', 'agrovet_admin', 'property_admin',
        'carwash_admin', 'transport_admin', 'boarding_master',
        'county_admin', 'constituency_admin', 'constituency_staff'
    )
)
WITH CHECK (
    institution_id = get_curr_user_inst_id()
    AND get_curr_user_role() IN (
        'admin', 'head_teacher', 'agrovet_admin', 'property_admin',
        'carwash_admin', 'transport_admin', 'boarding_master',
        'county_admin', 'constituency_admin', 'constituency_staff'
    )
);
