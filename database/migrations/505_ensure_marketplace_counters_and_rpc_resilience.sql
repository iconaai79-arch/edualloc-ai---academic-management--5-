-- Migration 505: Ensure Marketplace Counters and increment_module_count Resilience
-- Resolves: [System API] RPC Error [increment_module_count]: { code: '42703', message: 'column "view_count" does not exist' }
--
-- 1. Ensure view_count and inquiry_count columns exist on retail_inventory_items and pm_listings
-- 2. Update increment_module_count RPC to be fully self-healing with dynamic column verification and exception safety
-- 3. Set search_path = public and grant permissions to anon, authenticated, service_role
-- 4. Reload PostgREST schema cache

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure columns exist on retail_inventory_items
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_inventory_items'
    ) THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0;
    END IF;

    -- 2. Ensure columns exist on pm_listings
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'pm_listings'
    ) THEN
        ALTER TABLE public.pm_listings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
        ALTER TABLE public.pm_listings ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Resilient, self-healing increment_module_count function
CREATE OR REPLACE FUNCTION public.increment_module_count(t_name TEXT, r_id TEXT, f_name TEXT)
RETURNS void AS $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Validate parameters
    IF t_name IS NULL OR r_id IS NULL OR f_name IS NULL THEN
        RETURN;
    END IF;

    -- Restrict target fields to prevent arbitrary column updates
    IF f_name NOT IN ('view_count', 'inquiry_count', 'click_count', 'download_count') THEN
        RETURN;
    END IF;

    -- Ensure table name is a safe single identifier in public schema
    IF t_name !~ '^[a-zA-Z0-9_]+$' THEN
        RETURN;
    END IF;

    -- Check if column exists on target table in public schema
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = t_name 
          AND column_name = f_name
    ) INTO col_exists;

    -- Self-healing: if column does not exist yet, attempt to add it
    IF NOT col_exists THEN
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I INTEGER DEFAULT 0', t_name, f_name);
        EXCEPTION WHEN OTHERS THEN
            RETURN;
        END;
    END IF;

    -- Atomically increment counter
    EXECUTE format('UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = %L', t_name, f_name, f_name, r_id);
EXCEPTION WHEN OTHERS THEN
    -- Never raise exceptions on view/inquiry counter increments
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.increment_module_count(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. Planner stats & PostgREST reload
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_inventory_items') THEN
        ANALYZE public.retail_inventory_items;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_listings') THEN
        ANALYZE public.pm_listings;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
