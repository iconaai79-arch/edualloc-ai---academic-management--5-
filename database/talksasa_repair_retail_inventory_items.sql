-- ==============================================================================
-- TALKSASA RETAIL INVENTORY & STORES REPAIR MIGRATION
-- Safely adds missing columns to retail_inventory_items, retail_stores,
-- retail_store_stock, retail_suppliers, retail_sales, and companion retail tables.
-- Idempotent, safe to run multiple times, compatible with all PostgreSQL versions.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Ensure retail_inventory_items exists and has all standard snake_case and camelCase columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_inventory_items'
    ) THEN
        -- Price & financial columns
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

        -- Stock & inventory metrics
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS buffer_stock INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "bufferStock" INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

        -- Flags & engagement
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "marketplaceEnabled" BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "inquiryCount" INTEGER DEFAULT 0;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

        -- Identifiers & classifications
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS barcode TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS unit_of_measure TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS image_url TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS source TEXT;

        -- Store, supplier & procurement relationships
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

        -- Timestamps
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS last_updated TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS "lastUpdated" TEXT;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ELSE
        -- Create table if absent
        CREATE TABLE IF NOT EXISTS public.retail_inventory_items (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'General',
            description TEXT,
            cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
            "costPrice" DECIMAL(12, 2) DEFAULT 0,
            base_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
            "basePrice" DECIMAL(12, 2) DEFAULT 0,
            srp_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
            "srpPrice" DECIMAL(12, 2) DEFAULT 0,
            selling_price DECIMAL(12, 2) DEFAULT 0,
            "sellingPrice" DECIMAL(12, 2) DEFAULT 0,
            unit_price DECIMAL(12, 2) DEFAULT 0,
            "unitPrice" DECIMAL(12, 2) DEFAULT 0,
            unit TEXT NOT NULL DEFAULT 'pcs',
            unit_of_measure TEXT,
            sku TEXT,
            barcode TEXT,
            reorder_level INTEGER NOT NULL DEFAULT 0,
            "reorderLevel" INTEGER DEFAULT 0,
            buffer_stock INTEGER NOT NULL DEFAULT 0,
            "bufferStock" INTEGER DEFAULT 0,
            quantity INTEGER DEFAULT 0,
            marketplace_enabled BOOLEAN DEFAULT FALSE,
            "marketplaceEnabled" BOOLEAN DEFAULT FALSE,
            view_count INTEGER DEFAULT 0,
            inquiry_count INTEGER DEFAULT 0,
            supplier_id TEXT,
            store_id TEXT,
            store_name TEXT,
            procurement_account_id TEXT,
            procurement_account_name TEXT,
            image_url TEXT,
            "imageUrl" TEXT,
            source TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            "isActive" BOOLEAN DEFAULT TRUE,
            last_updated TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- 2. Ensure retail_stores companion columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_stores'
    ) THEN
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'main_store';
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS location TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS store_manager_id TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS agent_id TEXT;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS mpesa_config JSONB;
        ALTER TABLE public.retail_stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- 3. Ensure retail_store_stock companion columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_store_stock'
    ) THEN
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS store_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS item_id TEXT;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.retail_store_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- 4. Ensure retail_suppliers companion columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_suppliers'
    ) THEN
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.retail_suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- 5. Ensure retail_expenses companion columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_expenses'
    ) THEN
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

    -- 6. Ensure retail_sales companion columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_sales'
    ) THEN
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

    -- Synchronize cost_price and "costPrice" if either has a non-zero value
    UPDATE public.retail_inventory_items
    SET cost_price = "costPrice"
    WHERE (cost_price IS NULL OR cost_price = 0)
      AND "costPrice" IS NOT NULL AND "costPrice" > 0;

    UPDATE public.retail_inventory_items
    SET "costPrice" = cost_price
    WHERE ("costPrice" IS NULL OR "costPrice" = 0)
      AND cost_price IS NOT NULL AND cost_price > 0;

    -- Synchronize selling_price / srp_price
    UPDATE public.retail_inventory_items
    SET srp_price = COALESCE(NULLIF(selling_price, 0), NULLIF(base_price, 0), 0)
    WHERE srp_price = 0;

END $$;

-- 7. Optimized indices
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
