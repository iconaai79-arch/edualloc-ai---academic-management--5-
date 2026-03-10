-- Migration: 088_fix_retail_transfer_id_types
-- Description: Converts UUID FK columns in retail_stock_transfers and
--              retail_stock_transfer_items to TEXT to be compatible with the
--              app's text-based user IDs (same pattern as institution_id TEXT).
--              This fixes the "invalid input syntax for type uuid" error.

-- 1. retail_stock_transfers: relax requested_by_id and approved_by_id
ALTER TABLE public.retail_stock_transfers
    ALTER COLUMN requested_by_id TYPE TEXT USING requested_by_id::TEXT,
    ALTER COLUMN approved_by_id  TYPE TEXT USING approved_by_id::TEXT;

-- Drop auth.users FK constraints that block text IDs
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname LIKE '%retail_stock_transfers_requested_by_id%'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            DROP CONSTRAINT retail_stock_transfers_requested_by_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname LIKE '%retail_stock_transfers_approved_by_id%'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            DROP CONSTRAINT retail_stock_transfers_approved_by_id_fkey;
    END IF;
END $$;
