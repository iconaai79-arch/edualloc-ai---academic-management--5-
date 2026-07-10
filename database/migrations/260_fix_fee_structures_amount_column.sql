-- Migration: Ensure fee_structures table has the 'amount' column
-- This fixes an issue where amount fields were not being saved

DO $$
BEGIN
    -- Add 'amount' column to fee_structures if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fee_structures' AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.fee_structures ADD COLUMN amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added amount column to fee_structures table';
    ELSE
        RAISE NOTICE 'amount column already exists in fee_structures table';
    END IF;

    -- Add 'allocated_amount' as alias column if needed (for compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fee_structures' AND column_name = 'allocated_amount'
    ) THEN
        ALTER TABLE public.fee_structures ADD COLUMN allocated_amount DECIMAL(12, 2) DEFAULT 0;
        RAISE NOTICE 'Added allocated_amount column to fee_structures table';
    ELSE
        RAISE NOTICE 'allocated_amount column already exists in fee_structures table';
    END IF;

    -- Sync allocated_amount from amount where allocated_amount is 0 but amount > 0
    UPDATE public.fee_structures
    SET allocated_amount = amount
    WHERE (allocated_amount IS NULL OR allocated_amount = 0) AND amount > 0;

    -- Sync amount from allocated_amount where amount is 0 but allocated_amount > 0
    UPDATE public.fee_structures
    SET amount = allocated_amount
    WHERE (amount IS NULL OR amount = 0) AND allocated_amount > 0;

    RAISE NOTICE 'fee_structures amount sync complete.';
END $$;
