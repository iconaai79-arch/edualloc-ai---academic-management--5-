-- Migration 094 (V2): Ultimate ID Fix for Retail Stores and Requisitions
-- This migration converts retail_stores.id and all its references to TEXT to resolve type mismatches.

DO $$ 
BEGIN 
    -- 1. DROP ALL FOREIGN KEY CONSTRAINTS REFERENCING retail_stores
    ALTER TABLE public.retail_store_stock DROP CONSTRAINT IF EXISTS retail_store_stock_store_id_fkey;
    ALTER TABLE public.retail_serialized_items DROP CONSTRAINT IF EXISTS retail_serialized_items_store_id_fkey;
    ALTER TABLE public.retail_stock_transfers DROP CONSTRAINT IF EXISTS retail_stock_transfers_source_store_id_fkey;
    ALTER TABLE public.retail_stock_transfers DROP CONSTRAINT IF EXISTS retail_stock_transfers_destination_store_id_fkey;
    ALTER TABLE public.retail_sales DROP CONSTRAINT IF EXISTS retail_sales_store_id_fkey;
    ALTER TABLE public.retail_expenses DROP CONSTRAINT IF EXISTS retail_expenses_store_id_fkey;
    ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_store_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consolidated_order') THEN
        ALTER TABLE public.consolidated_order DROP CONSTRAINT IF EXISTS consolidated_order_store_id_fkey;
    END IF;

    ALTER TABLE public.retail_store_stock DROP CONSTRAINT IF EXISTS retail_store_stock_item_id_fkey;
    ALTER TABLE public.retail_serialized_items DROP CONSTRAINT IF EXISTS retail_serialized_items_item_id_fkey;
    ALTER TABLE public.retail_stock_transfer_items DROP CONSTRAINT IF EXISTS retail_stock_transfer_items_item_id_fkey;
    ALTER TABLE public.retail_commissions_ledger DROP CONSTRAINT IF EXISTS retail_commissions_ledger_item_id_fkey;

    -- 2. DROP PRIMARY KEYS
    ALTER TABLE public.retail_stores DROP CONSTRAINT IF EXISTS retail_stores_pkey;
    ALTER TABLE public.retail_inventory_items DROP CONSTRAINT IF EXISTS retail_inventory_items_pkey;

    -- 3. CONVERT ID COLUMNS TO TEXT
    ALTER TABLE public.retail_stores ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.retail_inventory_items ALTER COLUMN id TYPE TEXT USING id::text;
    
    -- 4. CONVERT REFERENCING COLUMNS TO TEXT
    ALTER TABLE public.retail_store_stock ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    ALTER TABLE public.retail_store_stock ALTER COLUMN item_id TYPE TEXT USING item_id::text;

    ALTER TABLE public.retail_serialized_items ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    ALTER TABLE public.retail_serialized_items ALTER COLUMN item_id TYPE TEXT USING item_id::text;

    ALTER TABLE public.retail_stock_transfers ALTER COLUMN source_store_id TYPE TEXT USING source_store_id::text;
    ALTER TABLE public.retail_stock_transfers ALTER COLUMN destination_store_id TYPE TEXT USING destination_store_id::text;
    
    ALTER TABLE public.retail_stock_transfer_items ALTER COLUMN item_id TYPE TEXT USING item_id::text;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'retail_sales') THEN
        ALTER TABLE public.retail_sales ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    END IF;

    ALTER TABLE public.retail_expenses ALTER COLUMN store_id TYPE TEXT USING store_id::text;

    -- Add store_id to requisitions if it doesn't exist, then convert to TEXT
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'store_id') THEN
        ALTER TABLE public.requisitions ADD COLUMN store_id TEXT;
    ELSE
        ALTER TABLE public.requisitions ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consolidated_order') THEN
        ALTER TABLE public.consolidated_order ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    END IF;

    ALTER TABLE public.retail_commissions_ledger ALTER COLUMN item_id TYPE TEXT USING item_id::text;

    -- 5. RE-ADD PRIMARY KEYS
    ALTER TABLE public.retail_stores ADD PRIMARY KEY (id);
    ALTER TABLE public.retail_inventory_items ADD PRIMARY KEY (id);

    -- 6. RE-ADD FOREIGN KEY CONSTRAINTS
    ALTER TABLE public.retail_store_stock ADD CONSTRAINT retail_store_stock_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    ALTER TABLE public.retail_store_stock ADD CONSTRAINT retail_store_stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;

    ALTER TABLE public.retail_serialized_items ADD CONSTRAINT retail_serialized_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    ALTER TABLE public.retail_serialized_items ADD CONSTRAINT retail_serialized_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;

    ALTER TABLE public.retail_stock_transfers ADD CONSTRAINT retail_stock_transfers_source_store_id_fkey FOREIGN KEY (source_store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    ALTER TABLE public.retail_stock_transfers ADD CONSTRAINT retail_stock_transfers_destination_store_id_fkey FOREIGN KEY (destination_store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    
    ALTER TABLE public.retail_stock_transfer_items ADD CONSTRAINT retail_stock_transfer_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'retail_sales') THEN
        ALTER TABLE public.retail_sales ADD CONSTRAINT retail_sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    END IF;

    ALTER TABLE public.retail_expenses ADD CONSTRAINT retail_expenses_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE SET NULL;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consolidated_order') THEN
        ALTER TABLE public.consolidated_order ADD CONSTRAINT consolidated_order_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
    END IF;

    ALTER TABLE public.retail_commissions_ledger ADD CONSTRAINT retail_commissions_ledger_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;

    -- 7. RELOAD SCHEMA CACHE
    NOTIFY pgrst, 'reload schema';

END $$;
