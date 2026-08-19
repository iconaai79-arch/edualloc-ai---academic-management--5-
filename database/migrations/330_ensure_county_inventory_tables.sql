-- Migration 330: Ensure county_inventory, county_inventory_categories, and county_stores tables exist with TEXT IDs
-- Description: Standardizes county inventory tracking, asset categories, physical stores, QR tracking, and PostgREST schema cache reload.

-- 1. County Inventory Categories
CREATE TABLE IF NOT EXISTS public.county_inventory_categories (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. County Physical Stores / Depots
CREATE TABLE IF NOT EXISTS public.county_stores (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location_name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. County Central Inventory & Asset Distribution
CREATE TABLE IF NOT EXISTS public.county_inventory (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Units',
    supplier_name TEXT,
    status TEXT DEFAULT 'at_hq' CHECK (status IN ('at_hq', 'in_transit', 'received')),
    target_institution_id TEXT,
    driver_name TEXT,
    delivery_method TEXT DEFAULT 'driver' CHECK (delivery_method IN ('driver', 'parcel')),
    tracking_number TEXT,
    qr_code TEXT,
    at_hq_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    recipient_signature TEXT,
    received_by TEXT,
    recipient_name TEXT,
    dispatched_date TIMESTAMPTZ,
    received_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure text types if previously created as UUID
DO $$ 
BEGIN
    -- county_inventory_categories
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_inventory_categories' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_inventory_categories ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_inventory_categories' 
          AND column_name = 'county_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_inventory_categories ALTER COLUMN county_id TYPE TEXT USING county_id::TEXT;
    END IF;

    -- county_stores
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_stores' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_stores ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_stores' 
          AND column_name = 'county_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_stores ALTER COLUMN county_id TYPE TEXT USING county_id::TEXT;
    END IF;

    -- county_inventory
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_inventory' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_inventory ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_inventory' 
          AND column_name = 'county_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_inventory ALTER COLUMN county_id TYPE TEXT USING county_id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'county_inventory' 
          AND column_name = 'target_institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.county_inventory ALTER COLUMN target_institution_id TYPE TEXT USING target_institution_id::TEXT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_county_inv_cat_county ON public.county_inventory_categories(county_id);
CREATE INDEX IF NOT EXISTS idx_county_stores_county ON public.county_stores(county_id);
CREATE INDEX IF NOT EXISTS idx_county_inv_county ON public.county_inventory(county_id);
CREATE INDEX IF NOT EXISTS idx_county_inv_target ON public.county_inventory(target_institution_id);
CREATE INDEX IF NOT EXISTS idx_county_inv_status ON public.county_inventory(status);
CREATE INDEX IF NOT EXISTS idx_county_inv_category ON public.county_inventory(category);

-- Enable RLS
ALTER TABLE public.county_inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.county_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.county_inventory ENABLE ROW LEVEL SECURITY;

-- Scoped County Inventory RLS Policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['county_inventory_categories', 'county_stores', 'county_inventory'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_all_access" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role()::text = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
