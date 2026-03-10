-- Add missing columns to the retail_inventory_items table
DO $$ 
BEGIN 
    -- 1. sku
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='sku') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN sku TEXT;
    END IF;

    -- 2. barcode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='barcode') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN barcode TEXT;
    END IF;

    -- 3. cost_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='cost_price') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    -- 4. quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='quantity') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- 5. last_updated
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='last_updated') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
