-- Migration: 088_fix_retail_transfer_id_types
-- Description: Relaxes UUID FK constraints on user ID columns in
--              retail_stock_transfers so the app's text-based user IDs work.
--              IMPORTANT: Drop constraints FIRST, then alter column types.

-- Step 1: Drop FK constraints (must happen before type change)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'retail_stock_transfers_requested_by_id_fkey'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            DROP CONSTRAINT retail_stock_transfers_requested_by_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'retail_stock_transfers_approved_by_id_fkey'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            DROP CONSTRAINT retail_stock_transfers_approved_by_id_fkey;
    END IF;
END $$;

-- Step 2: Change column types from UUID to TEXT
ALTER TABLE public.retail_stock_transfers
    ALTER COLUMN requested_by_id TYPE TEXT USING requested_by_id::TEXT;

ALTER TABLE public.retail_stock_transfers
    ALTER COLUMN approved_by_id TYPE TEXT USING approved_by_id::TEXT;
