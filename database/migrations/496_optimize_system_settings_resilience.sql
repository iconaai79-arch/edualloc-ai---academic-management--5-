-- ==============================================================================
-- Migration 496: Optimize System Settings Resilience & RLS Configuration
-- Purpose:
-- 1. Ensure public.system_settings table exists with proper columns and constraints.
-- 2. Seed default row id = 1 with empty JSONB object if absent.
-- 3. Create index on (id) for ultra-fast point lookups.
-- 4. Establish permissive master RLS policies for anon, authenticated, and service_role.
-- 5. Grant explicit permissions and notify PostgREST schema reload.
-- ==============================================================================

-- 1. Ensure Table Structure
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure updated_at column exists in case table was created with older schema
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'system_settings' 
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.system_settings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 2. Seed id = 1 Default Row
INSERT INTO public.system_settings (id, data, updated_at)
VALUES (1, '{}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Composite and Primary Indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_id ON public.system_settings (id);

-- 4. Permissive Master RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive or legacy policies
DROP POLICY IF EXISTS "System settings restricted" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_read_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_write_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_all_access" ON public.system_settings;

-- Public read access so portal, branding, and billing settings can load seamlessly
CREATE POLICY "system_settings_read_policy"
    ON public.system_settings
    FOR SELECT
    TO public, anon, authenticated, service_role
    USING (true);

-- Permissive write policy for updates/upserts
CREATE POLICY "system_settings_write_policy"
    ON public.system_settings
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Explicit Grants
GRANT ALL ON public.system_settings TO anon, authenticated, service_role;

-- 6. Update Planner Statistics & Notify Schema Cache
ANALYZE public.system_settings;
NOTIFY pgrst, 'reload schema';
