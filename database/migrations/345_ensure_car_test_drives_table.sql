-- Migration 345: Ensure car_test_drives table and PostgREST schema cache reload
-- Description: Creates the car_test_drives table if not present, ensures institution_id column, adds indexes, RLS policies, and notifies PostgREST to refresh its schema cache.

CREATE TABLE IF NOT EXISTS public.car_test_drives (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    listing_id TEXT,
    buyer_id TEXT,
    buyer_name TEXT,
    buyer_phone TEXT,
    booking_date TIMESTAMPTZ,
    delivery_address TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist if table was created previously without institution_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'car_test_drives' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.car_test_drives ADD COLUMN institution_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'car_test_drives' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.car_test_drives ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Indexes for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_car_test_drives_inst ON public.car_test_drives(institution_id);
CREATE INDEX IF NOT EXISTS idx_car_test_drives_listing ON public.car_test_drives(listing_id);

-- Enable RLS
ALTER TABLE public.car_test_drives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public Test Drive Request" ON public.car_test_drives;
DROP POLICY IF EXISTS "Test Drive Manage Policy" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_select" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_insert" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_update" ON public.car_test_drives;
DROP POLICY IF EXISTS "car_test_drives_delete" ON public.car_test_drives;

-- Granular scoped policies
CREATE POLICY "car_test_drives_select" ON public.car_test_drives
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR institution_id IS NULL OR auth.role() = 'anon');

CREATE POLICY "car_test_drives_insert" ON public.car_test_drives
    FOR INSERT TO authenticated, anon
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "car_test_drives_update" ON public.car_test_drives
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR institution_id IS NULL)
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "car_test_drives_delete" ON public.car_test_drives
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.car_test_drives TO anon, authenticated, service_role;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
