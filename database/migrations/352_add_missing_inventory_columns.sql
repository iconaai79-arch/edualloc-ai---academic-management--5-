-- Migration 352: Add missing columns to inventory table
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'status' for [inventory]"
-- These fields exist in the InventoryItem TypeScript interface but were missing from the DB table.

ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS min_threshold INTEGER;

COMMENT ON COLUMN public.inventory.status       IS 'Item status: active, inactive, discontinued';
COMMENT ON COLUMN public.inventory.price        IS 'Unit purchase/cost price of the item';
COMMENT ON COLUMN public.inventory.min_threshold IS 'Minimum stock threshold before low-stock alert triggers';
