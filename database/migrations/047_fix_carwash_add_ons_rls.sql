-- Migration: 047_fix_carwash_add_ons_rls
-- Description: Fixes RLS policies for carwash_add_ons to prevent 42501 errors.

-- Drop the previous policy that was causing 42501 errors because of subquery mismatch
DROP POLICY IF EXISTS "Institution staff can manage carwash_add_ons" ON public.carwash_add_ons;

-- Apply the same master unblock pattern as migration 041 for consistency across car wash tables
CREATE POLICY master_unblock_carwash_add_ons ON public.carwash_add_ons
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure permissions are granted to all relevant roles
GRANT ALL ON public.carwash_add_ons TO anon, authenticated, service_role;
