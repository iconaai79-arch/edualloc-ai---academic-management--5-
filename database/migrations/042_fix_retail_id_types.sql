-- Migration 042: Fix Retail ID Types (UUID to TEXT Conversion) v4
-- Description: Converts all retail-related ID and foreign key columns from UUID to TEXT.
-- This version handles conditional conversion for the requisitions table.

-- 1. DROP ALL FOREIGN KEY CONSTRAINTS
ALTER TABLE public.retail_stores DROP CONSTRAINT IF EXISTS retail_stores_store_manager_id_fkey;
ALTER TABLE public.retail_stores DROP CONSTRAINT IF EXISTS retail_stores_agent_id_fkey;

ALTER TABLE public.retail_store_stock DROP CONSTRAINT IF EXISTS retail_store_stock_store_id_fkey;
ALTER TABLE public.retail_store_stock DROP CONSTRAINT IF EXISTS retail_store_stock_item_id_fkey;

ALTER TABLE public.retail_serialized_items DROP CONSTRAINT IF EXISTS retail_serialized_items_item_id_fkey;
ALTER TABLE public.retail_serialized_items DROP CONSTRAINT IF EXISTS retail_serialized_items_store_id_fkey;
ALTER TABLE public.retail_serialized_items DROP CONSTRAINT IF EXISTS retail_serialized_items_sale_id_fkey;

ALTER TABLE public.retail_stock_transfers DROP CONSTRAINT IF EXISTS retail_stock_transfers_source_store_id_fkey;
ALTER TABLE public.retail_stock_transfers DROP CONSTRAINT IF EXISTS retail_stock_transfers_destination_store_id_fkey;
ALTER TABLE public.retail_stock_transfers DROP CONSTRAINT IF EXISTS retail_stock_transfers_requested_by_id_fkey;
ALTER TABLE public.retail_stock_transfers DROP CONSTRAINT IF EXISTS retail_stock_transfers_approved_by_id_fkey;

ALTER TABLE public.retail_stock_transfer_items DROP CONSTRAINT IF EXISTS retail_stock_transfer_items_transfer_id_fkey;
ALTER TABLE public.retail_stock_transfer_items DROP CONSTRAINT IF EXISTS retail_stock_transfer_items_item_id_fkey;

ALTER TABLE public.retail_sales DROP CONSTRAINT IF EXISTS retail_sales_store_id_fkey;
ALTER TABLE public.retail_sales DROP CONSTRAINT IF EXISTS retail_sales_agent_id_fkey;

ALTER TABLE public.retail_commissions_ledger DROP CONSTRAINT IF EXISTS retail_commissions_ledger_sale_id_fkey;
ALTER TABLE public.retail_commissions_ledger DROP CONSTRAINT IF EXISTS retail_commissions_ledger_item_id_fkey;
ALTER TABLE public.retail_commissions_ledger DROP CONSTRAINT IF EXISTS retail_commissions_ledger_agent_id_fkey;

ALTER TABLE public.retail_wishlist DROP CONSTRAINT IF EXISTS retail_wishlist_captured_by_id_fkey;

ALTER TABLE public.retail_expenses DROP CONSTRAINT IF EXISTS retail_expenses_store_id_fkey;
ALTER TABLE public.retail_expenses DROP CONSTRAINT IF EXISTS retail_expenses_recorded_by_id_fkey;

ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_store_id_fkey;

-- 2. CHANGE COLUMN TYPES FROM UUID TO TEXT
ALTER TABLE public.retail_stores ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_stores ALTER COLUMN store_manager_id TYPE TEXT USING store_manager_id::text;
ALTER TABLE public.retail_stores ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

ALTER TABLE public.retail_inventory_items ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.retail_store_stock ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_store_stock ALTER COLUMN store_id TYPE TEXT USING store_id::text;
ALTER TABLE public.retail_store_stock ALTER COLUMN item_id TYPE TEXT USING item_id::text;

ALTER TABLE public.retail_serialized_items ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_serialized_items ALTER COLUMN item_id TYPE TEXT USING item_id::text;
ALTER TABLE public.retail_serialized_items ALTER COLUMN store_id TYPE TEXT USING store_id::text;
ALTER TABLE public.retail_serialized_items ALTER COLUMN sale_id TYPE TEXT USING sale_id::text;

ALTER TABLE public.retail_stock_transfers ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_stock_transfers ALTER COLUMN source_store_id TYPE TEXT USING source_store_id::text;
ALTER TABLE public.retail_stock_transfers ALTER COLUMN destination_store_id TYPE TEXT USING destination_store_id::text;
ALTER TABLE public.retail_stock_transfers ALTER COLUMN requested_by_id TYPE TEXT USING requested_by_id::text;
ALTER TABLE public.retail_stock_transfers ALTER COLUMN approved_by_id TYPE TEXT USING approved_by_id::text;

ALTER TABLE public.retail_stock_transfer_items ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_stock_transfer_items ALTER COLUMN transfer_id TYPE TEXT USING transfer_id::text;
ALTER TABLE public.retail_stock_transfer_items ALTER COLUMN item_id TYPE TEXT USING item_id::text;

ALTER TABLE public.retail_sales ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_sales ALTER COLUMN store_id TYPE TEXT USING store_id::text;
ALTER TABLE public.retail_sales ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

ALTER TABLE public.retail_commissions_ledger ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_commissions_ledger ALTER COLUMN sale_id TYPE TEXT USING sale_id::text;
ALTER TABLE public.retail_commissions_ledger ALTER COLUMN item_id TYPE TEXT USING item_id::text;
ALTER TABLE public.retail_commissions_ledger ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

ALTER TABLE public.retail_wishlist ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_wishlist ALTER COLUMN captured_by_id TYPE TEXT USING captured_by_id::text;

ALTER TABLE public.retail_expenses ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.retail_expenses ALTER COLUMN store_id TYPE TEXT USING store_id::text;
ALTER TABLE public.retail_expenses ALTER COLUMN recorded_by_id TYPE TEXT USING recorded_by_id::text;

-- Conditional column alteration for requisitions
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='requisitions' AND column_name='store_id') THEN
        ALTER TABLE public.requisitions ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    END IF;
END $$;

-- 3. RE-ESTABLISH FOREIGN KEY CONSTRAINTS
ALTER TABLE public.retail_stores ADD CONSTRAINT retail_stores_store_manager_id_fkey FOREIGN KEY (store_manager_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.retail_stores ADD CONSTRAINT retail_stores_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.retail_store_stock ADD CONSTRAINT retail_store_stock_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
ALTER TABLE public.retail_store_stock ADD CONSTRAINT retail_store_stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;

ALTER TABLE public.retail_serialized_items ADD CONSTRAINT retail_serialized_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.retail_serialized_items ADD CONSTRAINT retail_serialized_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
ALTER TABLE public.retail_serialized_items ADD CONSTRAINT retail_serialized_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.retail_sales(id) ON DELETE SET NULL;

ALTER TABLE public.retail_stock_transfers ADD CONSTRAINT retail_stock_transfers_source_store_id_fkey FOREIGN KEY (source_store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
ALTER TABLE public.retail_stock_transfers ADD CONSTRAINT retail_stock_transfers_destination_store_id_fkey FOREIGN KEY (destination_store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
ALTER TABLE public.retail_stock_transfers ADD CONSTRAINT retail_stock_transfers_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.retail_stock_transfers ADD CONSTRAINT retail_stock_transfers_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.retail_stock_transfer_items ADD CONSTRAINT retail_stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.retail_stock_transfers(id) ON DELETE CASCADE;
ALTER TABLE public.retail_stock_transfer_items ADD CONSTRAINT retail_stock_transfer_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;

ALTER TABLE public.retail_sales ADD CONSTRAINT retail_sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
ALTER TABLE public.retail_sales ADD CONSTRAINT retail_sales_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.retail_commissions_ledger ADD CONSTRAINT retail_commissions_ledger_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.retail_sales(id) ON DELETE CASCADE;
ALTER TABLE public.retail_commissions_ledger ADD CONSTRAINT retail_commissions_ledger_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.retail_commissions_ledger ADD CONSTRAINT retail_commissions_ledger_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.retail_wishlist ADD CONSTRAINT retail_wishlist_captured_by_id_fkey FOREIGN KEY (captured_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.retail_expenses ADD CONSTRAINT retail_expenses_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE CASCADE;
ALTER TABLE public.retail_expenses ADD CONSTRAINT retail_expenses_recorded_by_id_fkey FOREIGN KEY (recorded_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Conditional foreign key for requisitions
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='requisitions' AND column_name='store_id') THEN
        ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE SET NULL;
    END IF;
END $$;
