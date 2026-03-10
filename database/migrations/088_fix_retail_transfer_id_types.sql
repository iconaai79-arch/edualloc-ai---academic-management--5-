-- Migration: 088_fix_retail_transfer_id_types
-- Description: Safely converts requested_by_id / approved_by_id from UUID FK
--              to TEXT in retail_stock_transfers. Handles partial states.

DO $$ BEGIN

    -- Step 1: Drop requested_by_id FK if it still exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'retail_stock_transfers_requested_by_id_fkey'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            DROP CONSTRAINT retail_stock_transfers_requested_by_id_fkey;
    END IF;

    -- Step 2: Drop approved_by_id FK if it still exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'retail_stock_transfers_approved_by_id_fkey'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            DROP CONSTRAINT retail_stock_transfers_approved_by_id_fkey;
    END IF;

    -- Step 3: Change requested_by_id to TEXT only if it's still UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'retail_stock_transfers'
          AND column_name = 'requested_by_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            ALTER COLUMN requested_by_id TYPE TEXT USING requested_by_id::TEXT;
    END IF;

    -- Step 4: Change approved_by_id to TEXT only if it's still UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'retail_stock_transfers'
          AND column_name = 'approved_by_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.retail_stock_transfers
            ALTER COLUMN approved_by_id TYPE TEXT USING approved_by_id::TEXT;
    END IF;

END $$;
