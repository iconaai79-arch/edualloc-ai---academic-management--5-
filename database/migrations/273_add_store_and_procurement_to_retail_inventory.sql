-- Migration: Add store and procurement account columns to retail_inventory_items
-- Path: database/migrations/273_add_store_and_procurement_to_retail_inventory.sql

DO $$
BEGIN
    -- 1. store_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='store_id') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN store_id TEXT;
    END IF;

    -- 2. store_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='store_name') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN store_name TEXT;
    END IF;

    -- 3. procurement_account_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='procurement_account_id') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN procurement_account_id TEXT;
    END IF;

    -- 4. procurement_account_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_inventory_items' AND column_name='procurement_account_name') THEN
        ALTER TABLE public.retail_inventory_items ADD COLUMN procurement_account_name TEXT;
    END IF;
END $$;
