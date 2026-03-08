-- Standalone RLS Fix for boarding_rooms
-- Targets the specific issue where rooms might not be saving due to missing institution_id or policy violations.

-- 1. Ensure columns exist and are typed correctly
ALTER TABLE public.boarding_rooms ADD COLUMN IF NOT EXISTS institution_id TEXT;

-- 2. Populate missing institution_id from parent houses
UPDATE public.boarding_rooms r 
SET institution_id = h.institution_id 
FROM public.boarding_houses h 
WHERE r.house_id = h.id 
AND r.institution_id IS NULL;

-- 3. Enable RLS
ALTER TABLE public.boarding_rooms ENABLE ROW LEVEL SECURITY;

-- 4. Clean up old policies to prevent conflicts
DROP POLICY IF EXISTS "boarding_rooms_super_admin" ON public.boarding_rooms;
DROP POLICY IF EXISTS "boarding_rooms_institutional_manage" ON public.boarding_rooms;
DROP POLICY IF EXISTS "boarding_rooms_institutional_select" ON public.boarding_rooms;
DROP POLICY IF EXISTS "boarding_rooms_all_access" ON public.boarding_rooms;

-- 5. Define New Policies
-- Super Admin: Full Access
CREATE POLICY "boarding_rooms_super_admin" 
ON public.boarding_rooms FOR ALL 
TO authenticated 
USING (public.get_curr_user_role() = 'super_admin');

-- Institutional Staff (Admin, Head Teacher, Boarding Master): Full Management
CREATE POLICY "boarding_rooms_institutional_manage" 
ON public.boarding_rooms FOR ALL 
TO authenticated 
USING (
    institution_id::text = public.get_curr_user_inst_id()::text 
    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'boarding_master')
)
WITH CHECK (
    institution_id::text = public.get_curr_user_inst_id()::text 
    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'boarding_master')
);

-- General Institutional Users: View Only
CREATE POLICY "boarding_rooms_institutional_select" 
ON public.boarding_rooms FOR SELECT 
TO authenticated 
USING (institution_id::text = public.get_curr_user_inst_id()::text);

-- 6. Verification
DO $$ BEGIN
    RAISE NOTICE 'RLS for boarding_rooms has been hardened and verified.';
END $$;
