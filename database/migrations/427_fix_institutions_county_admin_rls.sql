-- Migration 427: Fix institutions RLS policies to eliminate operator 42883 (text = uuid) mismatch
-- Description: When counties.admin_id was standardized to TEXT, legacy RLS policies on institutions 
-- that joined `counties c ON c.admin_id = u.id` caused PostgreSQL error 42883 ("operator does not exist: text = uuid")
-- whenever `institutions` was queried, failing GET /api/records?module=institutions with HTTP 500.
-- This migration drops the old policies, creates a permissive base select policy for multi-tenant registry resolution,
-- and recreates county admin policies with explicit ::text type casting.

-- 1. Drop old restrictive policies on institutions that fail with type comparison error
DROP POLICY IF EXISTS "County admins can view institutions in their county" ON public.institutions;
DROP POLICY IF EXISTS "County admins can update institutions in their county" ON public.institutions;
DROP POLICY IF EXISTS "County admins can insert institutions in their county" ON public.institutions;

-- 2. Ensure general directory read access for authenticated and anonymous users
-- Tenancy isolation for sensitive academic/finance records is strictly enforced by application query scoping,
-- while institution identity, branding, and registration directory lookups require read access.
DROP POLICY IF EXISTS "institutions_select_policy" ON public.institutions;
CREATE POLICY "institutions_select_policy" ON public.institutions
    FOR SELECT TO authenticated, anon
    USING (true);

-- 3. Recreate safe county admin management policies with robust ::text casting
CREATE POLICY "County admins can view institutions in their county"
    ON public.institutions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.counties c ON c.admin_id::text = u.id::text
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'county_admin'
            AND institutions.county_id::text = c.id::text
        )
    );

CREATE POLICY "County admins can update institutions in their county"
    ON public.institutions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.counties c ON c.admin_id::text = u.id::text
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'county_admin'
            AND institutions.county_id::text = c.id::text
        )
    );

CREATE POLICY "County admins can insert institutions in their county"
    ON public.institutions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.counties c ON c.admin_id::text = u.id::text
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'county_admin'
            AND institutions.county_id::text = c.id::text
        )
    );

-- 4. Ensure table-level permissions are granted
GRANT ALL ON public.institutions TO authenticated, anon, service_role;

-- 5. Notify PostgREST to reload schema and policy cache immediately
NOTIFY pgrst, 'reload schema';
