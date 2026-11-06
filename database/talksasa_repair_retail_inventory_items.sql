-- ==============================================================================
-- TALKSASA RETAIL INVENTORY & STORES REPAIR MIGRATION (V2 - Safe Dynamic Execution)
-- Safely adds missing columns to retail_inventory_items, retail_stores,
-- retail_store_stock, retail_suppliers, retail_sales, and companion retail tables.
-- Top-level DDL ensures all columns exist before any dynamic DML runs.
-- Safe dynamic EXECUTE with regex-based casting handles any existing data type.
-- ==============================================================================

-- 1. Ensure retail_inventory_items exists with primary columns
CREATE TABLE IF NOT EXISTS public.retail_inventory_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    base_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    srp_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12, 2) DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',
    sku TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add all snake_case and camelCase columns independently
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS base_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "basePrice" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS srp_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "srpPrice" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "sellingPrice" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(12, 2) DEFAULT 0;

ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS buffer_stock INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "bufferStock" INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "marketplaceEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "inquiryCount" INTEGER DEFAULT 0;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS unit_of_measure TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "storeName" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS procurement_account_id TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "procurementAccountId" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS procurement_account_name TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "procurementAccountName" TEXT;

ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS last_updated TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "lastUpdated" TEXT;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. Companion tables columns
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_stores') THEN
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'main_store';
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS location TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS store_manager_id TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS agent_id TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS mpesa_config JSONB;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_store_stock') THEN
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS store_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS item_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_suppliers') THEN
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_expenses') THEN
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS store_id TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS recorded_by TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS date TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
        ALTER TABLE public.retail_expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_sales') THEN
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS store_id TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS receipt_number TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS customer_id TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS payment_status TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS cashier_id TEXT;
        ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Safe sync of cost_price with explicit type casting and error containment
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_inventory_items' AND column_name = 'costPrice') THEN
        EXECUTE '
            UPDATE public.retail_inventory_items
            SET cost_price = COALESCE(NULLIF(regexp_replace("costPrice"::text, ''[^0-9.]'', '''', ''g''), '''')::decimal, 0)
            WHERE (cost_price IS NULL OR cost_price = 0)
              AND "costPrice" IS NOT NULL
              AND NULLIF(regexp_replace("costPrice"::text, ''[^0-9.]'', '''', ''g''), '''') IS NOT NULL;
        ';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_inventory_items' AND column_name = 'costPrice') THEN
        EXECUTE '
            UPDATE public.retail_inventory_items
            SET "costPrice" = cost_price
            WHERE ("costPrice" IS NULL OR "costPrice"::text = ''0'' OR "costPrice"::text = ''0.00'' OR "costPrice"::text = '''')
              AND cost_price IS NOT NULL
              AND cost_price > 0;
        ';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_inventory_items' AND column_name = 'sellingPrice') THEN
        EXECUTE '
            UPDATE public.retail_inventory_items
            SET selling_price = COALESCE(NULLIF(regexp_replace("sellingPrice"::text, ''[^0-9.]'', '''', ''g''), '''')::decimal, 0)
            WHERE (selling_price IS NULL OR selling_price = 0)
              AND "sellingPrice" IS NOT NULL
              AND NULLIF(regexp_replace("sellingPrice"::text, ''[^0-9.]'', '''', ''g''), '''') IS NOT NULL;
        ';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    UPDATE public.retail_inventory_items
    SET srp_price = COALESCE(NULLIF(selling_price, 0), NULLIF(base_price, 0), 0)
    WHERE srp_price = 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Optimized indices
CREATE INDEX IF NOT EXISTS idx_rii_inst_id_desc ON public.retail_inventory_items(institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_rii_inst_sku ON public.retail_inventory_items(institution_id, sku);
CREATE INDEX IF NOT EXISTS idx_rii_inst_barcode ON public.retail_inventory_items(institution_id, barcode);

-- Verify
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'retail_inventory_items' 
  AND column_name IN ('cost_price', 'costPrice', 'selling_price', 'srp_price', 'buffer_stock', 'marketplace_enabled');
