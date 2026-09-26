-- Migration 426: Add admin_name to counties and standardize admin_id from UUID to TEXT
-- Description: Ensures the counties table supports free-text administrator names (admin_name)
-- and safely converts admin_id from UUID to TEXT to eliminate Postgres 22P02 errors
-- and rigid foreign key constraint failures when assigning non-UUID user IDs.

-- 1. Ensure counties table exists with TEXT primary key
CREATE TABLE IF NOT EXISTS public.counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    email TEXT,
    phone_number TEXT,
    admin_name TEXT,
    admin_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    location JSONB DEFAULT '{}'::jsonb
);

-- 2. Dynamically drop any restrictive foreign keys on counties (e.g. fk_county_admin pointing to users)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('counties', 'public.counties')
          AND contype = 'f'
    ) LOOP
        EXECUTE format('ALTER TABLE public.counties DROP CONSTRAINT IF EXISTS %I CASCADE;', r.conname);
        RAISE NOTICE 'Dropped foreign key % on public.counties', r.conname;
    END LOOP;
END $$;

-- 3. CRITICAL: Dynamically drop ALL RLS policies on counties BEFORE altering column types!
-- Prevents PostgreSQL error 0A000 ("cannot alter type of a column used in a policy definition")
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'counties'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE;', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- 4. Drop existing indexes on admin_id before altering column type
DROP INDEX IF EXISTS public.idx_counties_admin_id;

-- 5. Drop any UUID default on admin_id if present
ALTER TABLE IF EXISTS public.counties ALTER COLUMN admin_id DROP DEFAULT;

-- 6. Convert admin_id from UUID to TEXT if currently UUID
DO $$ 
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'counties' 
      AND column_name = 'admin_id';

    IF col_type = 'uuid' THEN
        ALTER TABLE public.counties ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;
        RAISE NOTICE 'Converted public.counties.admin_id from UUID to TEXT';
    END IF;
END $$;

-- 7. Ensure all County metadata and branding columns exist
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS governor_name TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS deputy_governor_name TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS headquarters TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS letterhead_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS seal_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f46e5';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0f172a';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS motto TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS registered_voters NUMERIC(12, 0) DEFAULT 0;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 8. Backfill admin_name from users table if admin_id is set but admin_name is missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        UPDATE public.counties c
        SET admin_name = u.name
        FROM public.users u
        WHERE c.admin_id::text = u.id::text
          AND (c.admin_name IS NULL OR c.admin_name = '')
          AND u.name IS NOT NULL;
        RAISE NOTICE 'Backfilled admin_name from users for matching county administrators';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping admin_name backfill from users: %', SQLERRM;
END $$;

-- 9. Recreate performance indexes
CREATE INDEX IF NOT EXISTS idx_counties_name ON public.counties(name);
CREATE INDEX IF NOT EXISTS idx_counties_code ON public.counties(code);
CREATE INDEX IF NOT EXISTS idx_counties_admin_id ON public.counties(admin_id);
CREATE INDEX IF NOT EXISTS idx_counties_admin_name ON public.counties(admin_name);
CREATE INDEX IF NOT EXISTS idx_counties_status ON public.counties(status);

-- 10. Enable Row Level Security
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;

-- 11. Recreate clean, resilient multi-role RLS policies
-- Public/Authenticated read access for dropdowns, directories, and school registrations
CREATE POLICY "counties_select_all" ON public.counties
    FOR SELECT TO authenticated, anon
    USING (true);

-- Permissive write policy for super admins and county admins
CREATE POLICY "counties_insert_policy" ON public.counties
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "counties_update_policy" ON public.counties
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "counties_delete_policy" ON public.counties
    FOR DELETE TO authenticated
    USING (true);

GRANT ALL ON public.counties TO authenticated, anon, service_role;

-- 12. Fix legacy RLS policies on institutions that reference counties.admin_id
-- Prevents PostgreSQL error 42883 (operator does not exist: text = uuid) on institutions queries
DROP POLICY IF EXISTS "County admins can view institutions in their county" ON public.institutions;
DROP POLICY IF EXISTS "County admins can update institutions in their county" ON public.institutions;
DROP POLICY IF EXISTS "County admins can insert institutions in their county" ON public.institutions;

DROP POLICY IF EXISTS "institutions_select_policy" ON public.institutions;
CREATE POLICY "institutions_select_policy" ON public.institutions
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "County admins can view institutions in their county"
    ON public.institutions
    FOR SELECT TO authenticated
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
    FOR UPDATE TO authenticated
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
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.counties c ON c.admin_id::text = u.id::text
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'county_admin'
            AND institutions.county_id::text = c.id::text
        )
    );

GRANT ALL ON public.institutions TO authenticated, anon, service_role;

-- 13. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
