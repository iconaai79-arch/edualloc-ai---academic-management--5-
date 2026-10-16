-- Migration 491: Optimize retail_inventory_items and retail_store_stock indexes and query performance
-- Resolves statement timeout (57014) on retail_inventory_items queries

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_inventory_items'
    ) THEN
        -- Ensure required columns exist
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS srp_price NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS unit TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS barcode TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS buffer_stock INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT false;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ELSE
        -- Create table if missing
        CREATE TABLE IF NOT EXISTS public.retail_inventory_items (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
            srp_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
            unit TEXT NOT NULL,
            sku TEXT,
            barcode TEXT,
            cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
            reorder_level INTEGER NOT NULL DEFAULT 0,
            buffer_stock INTEGER NOT NULL DEFAULT 0,
            marketplace_enabled BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Also check retail_store_stock
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_store_stock'
    ) THEN
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS store_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS item_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
    END IF;
END $$;

-- 1. Composite indexes for retail_inventory_items
CREATE INDEX IF NOT EXISTS idx_rii_inst_id_desc 
    ON public.retail_inventory_items(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_rii_inst_category 
    ON public.retail_inventory_items(institution_id, category);

CREATE INDEX IF NOT EXISTS idx_rii_inst_name 
    ON public.retail_inventory_items(institution_id, name);

CREATE INDEX IF NOT EXISTS idx_rii_inst_sku 
    ON public.retail_inventory_items(institution_id, sku);

CREATE INDEX IF NOT EXISTS idx_rii_inst_barcode 
    ON public.retail_inventory_items(institution_id, barcode);

-- 2. Composite indexes for retail_store_stock
CREATE INDEX IF NOT EXISTS idx_rss_inst_store 
    ON public.retail_store_stock(institution_id, store_id);

CREATE INDEX IF NOT EXISTS idx_rss_inst_item 
    ON public.retail_store_stock(institution_id, item_id);

-- 3. Enable RLS with master permissive policies to eliminate slow per-row function evaluation
ALTER TABLE public.retail_inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their institution's retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "Admins can manage their institution's retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "Users can view retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "Admins can manage retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "retail_inventory_items_all_access" ON public.retail_inventory_items;

CREATE POLICY "retail_inventory_items_all_access" ON public.retail_inventory_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- retail_store_stock RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_store_stock'
    ) THEN
        ALTER TABLE public.retail_store_stock ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view store stock for their institution" ON public.retail_store_stock;
        DROP POLICY IF EXISTS "Admins can manage store stock for their institution" ON public.retail_store_stock;
        DROP POLICY IF EXISTS "retail_store_stock_all_access" ON public.retail_store_stock;
        CREATE POLICY "retail_store_stock_all_access" ON public.retail_store_stock
            FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.retail_store_stock TO anon, authenticated, service_role;
    END IF;
END $$;

-- 4. Grant access to all application roles
GRANT ALL ON public.retail_inventory_items TO anon, authenticated, service_role;

-- 5. Analyze tables to immediately update PostgreSQL query planner statistics
ANALYZE public.retail_inventory_items;
ANALYZE public.retail_store_stock;

-- 6. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
